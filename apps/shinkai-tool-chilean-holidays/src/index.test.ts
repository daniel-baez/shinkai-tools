import { Tool } from '../src/index';

test('exists definition', async () => {
  const tool = new Tool({});
  const definition = tool.getDefinition();
  expect(definition).toBeInstanceOf(Object);
});

test('run using top10=false, categoryName=DEXES, networkName=BSC', async () => {
  const tool = new Tool({
    chromePath: process.env?.CHROME_PATH,
  });

  const run_result = await tool.run({
    year: 2024
  });

  console.log('holidays', run_result.data.holidays);

  expect(run_result.data.holidays).toBeInstanceOf(Array);
  expect(run_result.data.holidays.length).toBeGreaterThanOrEqual(15)
  expect(run_result.data.holidays[0]).toEqual({
    day: 'Lunes, 01 de Enero',
    festivity: 'Año Nuevo',
    type: 'Civil',
    legalSupport: 'Ley 2.977, Ley 19.973',
    date: '01/01/2024',
    isMandatory: true,
  });

  // Check if the last holiday is Christmas
  const lastHoliday = run_result.data.holidays[run_result.data.holidays.length - 1];
  expect(lastHoliday).toEqual({
    day: 'Miércoles, 25 de Diciembre',
    festivity: 'Navidad',
    type: 'Religioso',
    legalSupport: 'Ley 2.977, Ley 19.973',
    date: '12/25/2024',
    isMandatory: true,
  });
}, 10000);

test('run using top10=false, categoryName=DEXES, networkName=BSC', async () => {
  const tool = new Tool({
    chromePath: process.env?.CHROME_PATH,
  });

  const result = tool.translateDateToAmericanFormat('Miércoles, 18 de Septiembre', 2024);

  expect(result).toBe('09/18/2024');
}, 10000);