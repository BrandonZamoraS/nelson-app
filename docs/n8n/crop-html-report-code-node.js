// Repo-maintained Code node script for PR review.
// On deploy, replace the workflow script on deploy with this version so the
// reviewed measurement-unit labels match the repo copy.

const payload = $input.first()?.json ?? {};
const report = payload.ok === true ? payload : payload;
const measurementUnit = String(report.measurement_unit ?? report.crop?.measurement_unit ?? 'kg').trim() || 'kg';
const legacyUnitLabel = measurementUnit === 'kg' ? 'kilos' : measurementUnit;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatMoney = (value) => {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const totalExpenses = typeof report.total_expenses === 'number'
  ? report.total_expenses
  : Number(report.total_expenses ?? 0);
const grossProfit = typeof report.gross_profit === 'number'
  ? report.gross_profit
  : Number(report.gross_profit ?? 0);
const netProfit = typeof report.net_profit === 'number'
  ? report.net_profit
  : Number(report.net_profit ?? grossProfit - totalExpenses);
const pricePerUnitLabel = `Price per ${measurementUnit}`;
const costPerUnitLabel = `Cost per ${measurementUnit}`;

const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Reporte de cultivo</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; }
      .metric { margin-bottom: 8px; }
    </style>
  </head>
  <body>
    <h1>Reporte de cultivo</h1>
    <p><strong>Cultivo:</strong> ${esc(report.crop?.description ?? 'Sin descripción')}</p>
    <p><strong>Unidad de medida:</strong> ${esc(measurementUnit)}</p>
    <div class="metric"><strong>Presupuesto:</strong> ${formatMoney(report.crop?.budget)}</div>
    <div class="metric"><strong>Gasto total:</strong> ${formatMoney(totalExpenses)}</div>
    <div class="metric"><strong>Ganancia bruta:</strong> ${formatMoney(grossProfit)}</div>
    <div class="metric"><strong>Ganancia neta:</strong> ${formatMoney(netProfit)}</div>
    <div class="metric"><strong>Rendimiento (${esc(legacyUnitLabel)}):</strong> ${esc(report.yield_amount ?? 'N/D')}</div>
    <div class="metric"><strong>${esc(pricePerUnitLabel)}:</strong> ${esc(report.price_per_unit ?? 'N/D')}</div>
    <div class="metric"><strong>${esc(costPerUnitLabel)}:</strong> ${esc(report.cost_per_unit ?? 'N/D')}</div>
    <div class="metric"><strong>Compatibilidad:</strong> si el flujo anterior esperaba kilos, cuando la unidad siga siendo kg se mantiene la etiqueta kilos.</div>
  </body>
</html>`;

return [{
  json: {
    ...report,
    measurement_unit: report.measurement_unit ?? report.crop?.measurement_unit ?? 'kg',
    measurementUnit,
    legacyUnitLabel,
    html,
  },
}];
