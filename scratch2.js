const { z } = require('zod');

const parseNumber = (val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  if (typeof val === 'string') {
    const parsed = Number(val.replace(',', '.'));
    return isNaN(parsed) ? undefined : parsed;
  }
  return Number(val);
};

const ProductSchema = z.object({
  name:         z.string({ required_error: 'Nom requis', invalid_type_error: 'Nom invalide' }).min(1, 'Nom requis'),
  brand:        z.string().optional(),
  reference:    z.string().optional(),
  description:  z.string().optional(),
  category:     z.enum(['COLORANT','SOIN','COIFFANT','SHAMPOING','OUTIL','REVENTE','AUTRE']),
  unit:         z.string().optional().default('unité'),
  currentStock: z.preprocess(parseNumber, z.number().min(0).default(0)),
  minStock:     z.preprocess(parseNumber, z.number().min(0).default(1)),
  purchasePrice:z.preprocess(parseNumber, z.number().min(0).default(0)),
  sellingPrice: z.preprocess(parseNumber, z.number().min(0).optional()),
})

const values = {
  name: "Majirel",
  brand: "",
  reference: "",
  description: "",
  category: "COLORANT",
  unit: "unité",
  currentStock: "10",
  minStock: "5",
  purchasePrice: "200",
  sellingPrice: ""
};

const res = ProductSchema.safeParse(values);
if (!res.success) {
  console.log(JSON.stringify(res.error.errors, null, 2));
} else {
  console.log("Success!");
}
