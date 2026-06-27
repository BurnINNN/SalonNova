const { z } = require('zod');
const schema = z.object({ name: z.string().min(1, 'Nom requis') });
const res = schema.safeParse({ name: "" });
if (!res.success) {
  console.log(JSON.stringify(res.error.errors, null, 2));
} else {
  console.log("Success");
}
