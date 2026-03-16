(function attachDateResolver(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});
  const validators = app.validators;
  const utils = app.utils;

  function getPacificToday() {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(new Date());
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  function addDays(date, offset) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + offset);
    return next;
  }

  function toDateDescriptor(date) {
    return {
      date,
      isoDate: utils.formatIsoDate(date),
      compactDate: utils.formatDate(date),
      weekday: date.getUTCDay(),
    };
  }

  function resolveDateRange(orderDate) {
    const parsed = orderDate ? validators.validateDate(orderDate) : getPacificToday();
    const weekday = parsed.getUTCDay();

    if (weekday === 1) {
      return [-2, -1, 0].map((offset) => toDateDescriptor(addDays(parsed, offset)));
    }

    return [toDateDescriptor(parsed)];
  }

  function resolveShipmentDate(shipmentDate) {
    const parsed = shipmentDate ? validators.validateDate(shipmentDate) : addDays(getPacificToday(), 1);
    return toDateDescriptor(parsed);
  }

  app.dateResolver = {
    addDays,
    getPacificToday,
    resolveDateRange,
    resolveShipmentDate,
  };
})(window);
