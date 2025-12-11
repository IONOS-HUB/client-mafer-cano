import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomerData } from "../invoice-types";
import {
  FileText,
  User,
  CreditCard,
  Banknote,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { PaymentMethod } from "../types";
import { cn } from "@/lib/utils";
import { customerService } from "@/features/customers/service";
import { toast } from "sonner";

const customerSchema = z
  .object({
    identification_type: z.enum(["ruc", "cedula", "passport"]),
    identification: z.string().min(10, "Identificación inválida"),
    business_name: z.string().optional(),
    name: z.string().optional(),
    email: z.string().email("Email inválido"),
    phone: z.string().min(10, "Teléfono inválido"),
    address: z.string().min(5, "Dirección inválida"),
  })
  .refine(
    (data) => {
      if (data.identification_type === "ruc") {
        return data.business_name && data.business_name.length > 0;
      } else {
        return data.name && data.name.length > 0;
      }
    },
    {
      message: "Nombre o razón social requerido",
      path: ["name"],
    }
  );

type CustomerFormValues = z.infer<typeof customerSchema>;

interface InvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFinalConsumer: (paymentDetails: PaymentDetails) => void;
  onConfirmWithData: (
    customerData: CustomerData,
    paymentDetails: PaymentDetails
  ) => void;
  total: number;
}

export interface PaymentDetails {
  method: PaymentMethod;
  amountReceived: number;
  change: number;
}

type Step = "selection" | "data_entry" | "payment";

export function InvoiceDialog({
  isOpen,
  onClose,
  onConfirmFinalConsumer,
  onConfirmWithData,
  total,
}: InvoiceDialogProps) {
  const [step, setStep] = useState<Step>("selection");
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountReceived, setAmountReceived] = useState<string>("");

  // Calcular cambio dinámicamente
  const parsedAmount = parseFloat(amountReceived) || 0;
  const change = Math.max(0, parsedAmount - total);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      identification_type: "cedula",
      identification: "",
      business_name: "",
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

    const identificationType = form.watch("identification_type");
    const identification = form.watch("identification");
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
    const [customerFound, setCustomerFound] = useState<boolean | null>(null);

    useEffect(() => {
        if (isOpen) {
            setStep("selection");
            setPaymentMethod("cash");
            setAmountReceived("");
            setCustomerData(null);
            setCustomerFound(null);
            form.reset();
        }
    }, [isOpen, form]);

  // Auto-completar datos del cliente cuando se ingresa la identificación
  useEffect(() => {
    const loadCustomerData = async () => {
      // Solo buscar si la identificación tiene al menos 10 caracteres
      if (!identification || identification.length < 10) {
        setCustomerFound(null);
        return;
      }

      setIsLoadingCustomer(true);
      setCustomerFound(null);
      try {
        const customer = await customerService.getCustomerByIdentification(
          identification
        );

        if (customer) {
          // Auto-completar los campos del formulario
          form.setValue("identification_type", customer.identification_type);
          form.setValue("identification", customer.identification);
          form.setValue("email", customer.email);
          form.setValue("phone", customer.phone);
          form.setValue("address", customer.address);

          if (
            customer.identification_type === "ruc" &&
            customer.business_name
          ) {
            form.setValue("business_name", customer.business_name);
          } else if (customer.name) {
            form.setValue("name", customer.name);
          }

          setCustomerFound(true);
          toast.success("Datos del cliente cargados automáticamente");
        } else {
          setCustomerFound(false);
        }
      } catch (error) {
        console.error("Error al cargar datos del cliente:", error);
        setCustomerFound(false);
      } finally {
        setIsLoadingCustomer(false);
      }
    };

    // Debounce: esperar 500ms después de que el usuario deje de escribir
    const timeoutId = setTimeout(() => {
      if (step === "data_entry") {
        loadCustomerData();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [identification, step, form]);

  // Resetear estado cuando cambia el tipo de identificación
  useEffect(() => {
    if (step === "data_entry") {
      setCustomerFound(null);
    }
  }, [identificationType, step]);

  const handleSelectFinalConsumer = () => {
    setCustomerData(null);
    setStep("payment");
  };

  const handleSelectWithData = () => {
    setStep("data_entry");
  };

  const handleSubmitData = async (values: CustomerFormValues) => {
    const data: CustomerData = {
      identification_type: values.identification_type,
      identification: values.identification,
      email: values.email,
      phone: values.phone,
      address: values.address,
    };

    if (values.identification_type === "ruc") {
      data.business_name = values.business_name;
    } else {
      data.name = values.name;
    }

    // Guardar o actualizar el cliente en la base de datos
    try {
      const wasNewCustomer = customerFound === false;
      await customerService.createOrUpdateCustomer({
        identification_type: data.identification_type,
        identification: data.identification,
        email: data.email,
        phone: data.phone,
        address: data.address,
        business_name: data.business_name,
        name: data.name,
      });
      
      if (wasNewCustomer) {
        toast.success("Cliente registrado exitosamente");
      }
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      // No bloquear el flujo si falla guardar el cliente
      toast.error("No se pudo guardar el cliente, pero la venta continuará");
    }

    setCustomerData(data);
    setStep("payment");
  };

  const handleConfirmPayment = () => {
    const paymentDetails: PaymentDetails = {
      method: paymentMethod,
      amountReceived: parseFloat(amountReceived) || total,
      change: change,
    };

    if (customerData) {
      onConfirmWithData(customerData, paymentDetails);
    } else {
      onConfirmFinalConsumer(paymentDetails);
    }
    onClose();
  };

  const quickCashOptions = [
    total,
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
    50,
    100,
  ]
    .filter((val, index, self) => val >= total && self.indexOf(val) === index)
    .sort((a, b) => a - b)
    .slice(0, 4);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">
            {step === "selection" && "Tipo de Factura"}
            {step === "data_entry" && "Datos del Cliente"}
            {step === "payment" && "Pago y Cambio"}
          </DialogTitle>
        </DialogHeader>

        {/* Resumen de Total siempre visible en Payment */}
        {step === "payment" && (
          <div className="bg-linear-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 p-6 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 shadow-lg mb-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                  Total a Pagar
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Monto total de la factura
                </p>
              </div>
              <span className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {step === "selection" && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Button
                variant="outline"
                className="h-44 flex flex-col gap-4 hover:bg-green-50 hover:border-green-500 dark:hover:bg-green-950/30 transition-all border-2 rounded-xl shadow-sm hover:shadow-md"
                onClick={handleSelectFinalConsumer}
              >
                <div className="h-20 w-20 rounded-full bg-linear-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 flex items-center justify-center shadow-sm">
                  <User className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-bold text-xl text-green-900 dark:text-green-100">Consumidor Final</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Venta rápida sin datos
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-44 flex flex-col gap-4 hover:bg-blue-50 hover:border-blue-500 dark:hover:bg-blue-950/30 transition-all border-2 rounded-xl shadow-sm hover:shadow-md"
                onClick={handleSelectWithData}
              >
                <div className="h-20 w-20 rounded-full bg-linear-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center shadow-sm">
                  <FileText className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-bold text-xl text-blue-900 dark:text-blue-100">Con Datos</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">RUC o Cédula</p>
                </div>
              </Button>
            </div>
          </div>
        )}

        {step === "data_entry" && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmitData)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="identification_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo ID</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cedula">Cédula</SelectItem>
                          <SelectItem value="ruc">RUC</SelectItem>
                          <SelectItem value="passport">Pasaporte</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="identification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identificación</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Número de ID"
                          {...field}
                          disabled={isLoadingCustomer}
                        />
                      </FormControl>
                      {isLoadingCustomer && (
                        <p className="text-xs text-muted-foreground">
                          Buscando cliente...
                        </p>
                      )}
                      {!isLoadingCustomer && customerFound === false && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-2">
                          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                            Cliente no encontrado. Por favor completa los datos del cliente. 
                            Se registrará automáticamente al continuar al pago.
                          </p>
                        </div>
                      )}
                      {!isLoadingCustomer && customerFound === true && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          ✓ Cliente encontrado - Datos cargados
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {identificationType === "ruc" ? (
                <FormField
                  control={form.control}
                  name="business_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razón Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la Empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del Cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="cliente@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="099..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Dirección completa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("selection")}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                </Button>
                <Button type="submit" className="flex-1">
                  Continuar al Pago
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === "payment" && (
          <div className="space-y-6">
            {/* Selección de Método de Pago */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("cash")}
                  className={cn(
                    "h-24 flex flex-col gap-2 rounded-xl transition-all shadow-sm",
                    paymentMethod === "cash" 
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-700 shadow-md" 
                      : "hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/20"
                  )}
                >
                  <Banknote className={cn(
                    "h-7 w-7",
                    paymentMethod === "cash" ? "text-white" : "text-emerald-600 dark:text-emerald-400"
                  )} />
                  <span className="font-semibold">Efectivo</span>
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("card")}
                  className={cn(
                    "h-24 flex flex-col gap-2 rounded-xl transition-all shadow-sm",
                    paymentMethod === "card" 
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 shadow-md" 
                      : "hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/20"
                  )}
                >
                  <CreditCard className={cn(
                    "h-7 w-7",
                    paymentMethod === "card" ? "text-white" : "text-blue-600 dark:text-blue-400"
                  )} />
                  <span className="font-semibold">Tarjeta</span>
                </Button>
                <Button
                  variant={paymentMethod === "transfer" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("transfer")}
                  className={cn(
                    "h-24 flex flex-col gap-2 rounded-xl transition-all shadow-sm",
                    paymentMethod === "transfer" 
                      ? "bg-purple-600 hover:bg-purple-700 text-white border-2 border-purple-700 shadow-md" 
                      : "hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/20"
                  )}
                >
                  <div className={cn(
                    "text-2xl",
                    paymentMethod === "transfer" ? "" : "opacity-70"
                  )}>🏦</div>
                  <span className="font-semibold">Transferencia</span>
                </Button>
              </div>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Monto Recibido
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-3.5 text-lg font-medium text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="pl-9 text-xl font-semibold h-12 rounded-lg border-2 focus:border-emerald-500"
                        placeholder="0.00"
                        autoFocus
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  {/* Botones de efectivo rápido */}
                  <div className="flex gap-2 flex-wrap">
                    {quickCashOptions.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmountReceived(amount.toString())}
                        className="flex-1 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 dark:hover:bg-emerald-950/20 rounded-lg font-medium"
                      >
                        ${amount.toFixed(2)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div
                  className={cn(
                    "p-5 rounded-xl flex justify-between items-center border-2 shadow-sm transition-all",
                    parsedAmount < total
                      ? "bg-linear-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-900"
                      : "bg-linear-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-900"
                  )}
                >
                  <div className="space-y-1">
                    <span className="text-sm font-semibold uppercase tracking-wide block">
                      {parsedAmount < total ? "Faltan:" : "Cambio a devolver:"}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {parsedAmount < total ? "El monto recibido es menor al total" : "Monto adicional a devolver"}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-3xl font-bold",
                      parsedAmount < total
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    )}
                  >
                    $
                    {parsedAmount < total
                      ? (total - parsedAmount).toFixed(2)
                      : change.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setStep(customerData ? "data_entry" : "selection")
                }
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
              </Button>
              <Button
                onClick={handleConfirmPayment}
                className="flex-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all rounded-lg h-12 text-base font-semibold"
                disabled={
                  paymentMethod === "cash" &&
                  parseFloat(amountReceived || "0") < total
                }
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Confirmar y Facturar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
