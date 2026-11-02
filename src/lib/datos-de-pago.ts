// Where profesores pay their plan (shown on /plan). While it is empty, the page says the payment
// details are not set up yet.
// Each line is shown as is, label and value; leave a value empty to hide that line.

export const DATOS_DE_PAGO = {
  banco: "ueno bank",
  titular: "Jose Galvez",
  alias: "CI 4169298",
  cuenta: "16714744",
  // Where to send the receipt (WhatsApp number with country code): 0972 111 745.
  whatsapp: "595972111745",
};

export const pagoConfigurado = () =>
  Boolean(DATOS_DE_PAGO.titular && (DATOS_DE_PAGO.alias || DATOS_DE_PAGO.cuenta));
