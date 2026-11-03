// Where profesores pay their plan (shown on /plan). While it is empty, the page says the payment
// details are not set up yet.
// Each line is shown as is, label and value; leave a value empty to hide that line.

export const DATOS_DE_PAGO = {
  banco: "",
  titular: "Jose Galvez",
  alias: "",
  cuenta: "",
  // Where to send the receipt (WhatsApp number with country code): 0986 103 839.
  whatsapp: "595986103839",
};

export const pagoConfigurado = () =>
  Boolean(DATOS_DE_PAGO.titular && (DATOS_DE_PAGO.alias || DATOS_DE_PAGO.cuenta));
