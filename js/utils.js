(function attachUtils(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomChoice(values) {
    return values[randomInt(0, values.length - 1)];
  }

  function generateUUID() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
  }

  function sanitizeFilename(value) {
    return String(value || "output")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/\s+/g, "_");
  }

  function formatDate(date) {
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("");
  }

  function formatIsoDate(date) {
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  function isBlank(value) {
    return value === null || value === undefined || String(value).trim() === "";
  }

  function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function roundCurrency(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function shuffleArray(values) {
    const copy = values.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const next = randomInt(0, index);
      [copy[index], copy[next]] = [copy[next], copy[index]];
    }
    return copy;
  }

  function createRoundRobinPool(values) {
    let pool = shuffleArray(values);
    let index = 0;

    function drawUnique(count) {
      if (values.length < count) {
        throw new Error("SKU pool smaller than required unique count.");
      }

      const selected = [];
      while (selected.length < count) {
        if (index >= pool.length) {
          pool = shuffleArray(values);
          index = 0;
        }

        const candidate = pool[index];
        index += 1;

        if (!selected.includes(candidate)) {
          selected.push(candidate);
        }
      }

      return selected;
    }

    return { drawUnique };
  }

  function countBy(values, selector) {
    return values.reduce((accumulator, value) => {
      const key = selector(value);
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  app.utils = {
    countBy,
    createRoundRobinPool,
    escapeHtml,
    formatDate,
    formatIsoDate,
    generateUUID,
    isBlank,
    randomChoice,
    randomInt,
    roundCurrency,
    sanitizeFilename,
    shuffleArray,
    toNumber,
  };
})(window);
