import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_ANTIBIOTIC_CONSUMABLE_NAME,
  DEFAULT_ANTIBIOTIC_MG_PER_LITER,
  DEFAULT_CONSUMABLES,
  DEFAULT_PDA_CONSUMABLE_NAME,
  DEFAULT_PDA_GRAMS_PER_LITER,
  DEFAULT_SPECIES,
  DEFAULT_STERILIZATION_METHODS,
  DEFAULT_ZONES,
  SETTING_KEYS,
} from "../src/lib/defaults";

const prisma = new PrismaClient();

async function main() {
  // --- Settings (base ratios + editable option lists) ---
  const settings: Record<string, string> = {
    [SETTING_KEYS.pdaGramsPerLiter]: String(DEFAULT_PDA_GRAMS_PER_LITER),
    [SETTING_KEYS.antibioticMgPerLiter]: String(DEFAULT_ANTIBIOTIC_MG_PER_LITER),
    [SETTING_KEYS.pdaConsumableName]: DEFAULT_PDA_CONSUMABLE_NAME,
    [SETTING_KEYS.antibioticConsumableName]: DEFAULT_ANTIBIOTIC_CONSUMABLE_NAME,
    [SETTING_KEYS.species]: JSON.stringify(DEFAULT_SPECIES),
    [SETTING_KEYS.sterilizationMethods]: JSON.stringify(
      DEFAULT_STERILIZATION_METHODS,
    ),
    [SETTING_KEYS.zones]: JSON.stringify(DEFAULT_ZONES),
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {}, // don't clobber user edits on re-seed
      create: { key, value },
    });
  }

  // --- Consumables ---
  for (const c of DEFAULT_CONSUMABLES) {
    await prisma.consumable.upsert({
      where: { name: c.name },
      update: {}, // preserve existing stock/threshold on re-seed
      create: c,
    });
  }

  // --- A few example batches so the app isn't empty on first run ---
  const existing = await prisma.batch.count();
  if (existing === 0) {
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}${String(
      today.getDate(),
    ).padStart(2, "0")}`;
    const d = (daysAgo: number) => {
      const x = new Date(today);
      x.setDate(x.getDate() - daysAgo);
      return x;
    };

    await prisma.batch.createMany({
      data: [
        {
          id: `AUR-${mmdd}-01`,
          species: "Auricularia sp.",
          quantity: 200,
          pdaBatchRef: "PDA-06",
          sterilizationMethod: "Pressure cooker",
          inoculationDate: d(1),
          zone: "Incubation",
          outcome: "CLEAN",
          notes: "First run of the cycle.",
        },
        {
          id: `PLE-${mmdd}-01`,
          species: "Pleurotus sp.",
          quantity: 150,
          pdaBatchRef: "PDA-06",
          sterilizationMethod: "Autoclave",
          inoculationDate: d(5),
          zone: "Incubation",
          outcome: "CONTAMINATED",
          notes: "Two bags showed green mold at day 4.",
        },
        {
          id: `PLE-${mmdd}-02`,
          species: "Pleurotus sp.",
          quantity: 180,
          pdaBatchRef: "PDA-05",
          sterilizationMethod: "Pressure cooker",
          inoculationDate: d(12),
          zone: "Fruiting tent",
          outcome: "FRUITED",
          notes: null,
        },
      ],
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
