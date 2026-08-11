import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const items = [
  { name: 'Медная труба (трасса)', unit: 'м', quantity: 20, minStock: 5 },
  { name: 'Кабель ВВГ 4x1.5', unit: 'м', quantity: 30, minStock: 10 },
  { name: 'Кронштейны', unit: 'компл', quantity: 4, minStock: 1 },
  { name: 'Анкера', unit: 'шт', quantity: 40, minStock: 10 },
  { name: 'Дренажный шланг', unit: 'м', quantity: 15, minStock: 5 },
  { name: 'Пена монтажная', unit: 'шт', quantity: 3, minStock: 1 },
]

async function main() {
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
  if ((await prisma.inventoryItem.count()) === 0) {
    await prisma.inventoryItem.createMany({ data: items })
  }
}

main().finally(() => prisma.$disconnect())
