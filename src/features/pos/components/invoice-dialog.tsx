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
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === "selection" && "Tipo de Factura"}
            {step === "data_entry" && "Datos del Cliente"}
            {step === "payment" && "Pago y Cambio"}
          </DialogTitle>
        </DialogHeader>

        {/* Resumen de Total siempre visible en Payment */}
        {step === "payment" && (
          <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-100 dark:border-zinc-800 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-muted-foreground">
                Total a Pagar
              </span>
              <span className="text-4xl font-bold text-zinc-900 dark:text-white">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {step === "selection" && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-40 flex flex-col gap-4 hover:bg-green-50 hover:border-green-500 dark:hover:bg-green-950/30 transition-all border-2"
                onClick={handleSelectFinalConsumer}
              >
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <User className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">Consumidor Final</p>
                  <p className="text-sm text-muted-foreground">
                    Venta rápida sin datos
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-40 flex flex-col gap-4 hover:bg-blue-50 hover:border-blue-500 dark:hover:bg-blue-950/30 transition-all border-2"
                onClick={handleSelectWithData}
              >
                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">Con Datos</p>
                  <p className="text-sm text-muted-foreground">RUC o Cédula</p>
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
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                onClick={() => setPaymentMethod("cash")}
                className="h-20 flex flex-col gap-1"
              >
                <Banknote className="h-6 w-6" />
                Efectivo
              </Button>
              <Button
                variant={paymentMethod === "card" ? "default" : "outline"}
                onClick={() => setPaymentMethod("card")}
                className="h-20 flex flex-col gap-1"
              >
                <CreditCard className="h-6 w-6" />
                Tarjeta
              </Button>
              <Button
                variant={paymentMethod === "transfer" ? "default" : "outline"}
                onClick={() => setPaymentMethod("transfer")}
                className="h-20 flex flex-col gap-1"
              >
                <div className="font-bold text-lg">🏦</div>
                Transferencia
              </Button>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monto Recibido</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="pl-7 text-lg"
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
                        className="flex-1"
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </div>

                <div
                  className={cn(
                    "p-4 rounded-lg flex justify-between items-center",
                    parsedAmount < total
                      ? "bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900"
                      : "bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900"
                  )}
                >
                  <span className="font-medium">
                    {parsedAmount < total ? "Faltan:" : "Cambio a devolver:"}
                  </span>
                  <span
                    className={cn(
                      "text-2xl font-bold",
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
                className="flex-[2] bg-green-600 hover:bg-green-700 text-white"
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
