/**
 * One-time backfill for R-31: converts existing Invoice documents from
 * floating-point dollar storage (subtotal/tax/discount/total,
 * lineItems[].unitPrice/.total) to the new integer-cents fields
 * (subtotalCents/taxCents/discountCents/totalCents,
 * lineItems[].unitPriceCents/.totalCents) — see models/invoice.ts.
 *
 * Safe to re-run: only touches documents that don't already have
 * subtotalCents set, so running it twice (or on a database where some
 * documents were already migrated) is a no-op for anything already done.
 *
 * Usage:
 *   node scripts/backfill-invoice-cents.js --dry-run   # preview only, no writes
 *   node scripts/backfill-invoice-cents.js             # actually migrate
 *
 * Requires MONGODB_URI in the environment (same variable the app itself
 * uses — see lib/env.ts). Run this BEFORE deploying the code that reads
 * the new *Cents fields, since documents this script hasn't reached yet
 * will otherwise read as missing/undefined until it runs.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports -- standalone CommonJS script run via plain `node`, not bundled through the app's ESM/TS build
const { MongoClient } = require("mongodb");

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 500;

function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set — aborting.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const invoices = db.collection("invoices");

    const filter = { subtotalCents: { $exists: false } };
    const totalToMigrate = await invoices.countDocuments(filter);
    console.log(
      `${DRY_RUN ? "[DRY RUN] " : ""}Found ${totalToMigrate} invoice(s) needing migration.`,
    );

    if (totalToMigrate === 0) {
      console.log("Nothing to do.");
      return;
    }

    let processed = 0;
    let errors = 0;
    const cursor = invoices.find(filter).batchSize(BATCH_SIZE);

    let batch = [];
    const flushBatch = async () => {
      if (batch.length === 0) return;
      if (!DRY_RUN) {
        await invoices.bulkWrite(batch, { ordered: false });
      }
      processed += batch.length;
      console.log(`Processed ${processed}/${totalToMigrate}...`);
      batch = [];
    };

    for await (const doc of cursor) {
      try {
        if (
          typeof doc.subtotal !== "number" ||
          typeof doc.tax !== "number" ||
          typeof doc.total !== "number"
        ) {
          console.warn(
            `Skipping invoice ${doc._id}: missing expected legacy subtotal/tax/total fields.`,
          );
          errors++;
          continue;
        }

        const lineItems = (doc.lineItems || []).map((item) => ({
          ...item,
          unitPriceCents: toCents(item.unitPrice),
          taxCents: item.tax !== undefined ? toCents(item.tax) : undefined,
          totalCents: toCents(item.total),
          unitPrice: undefined,
          tax: undefined,
          total: undefined,
        }));

        batch.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                subtotalCents: toCents(doc.subtotal),
                taxCents: toCents(doc.tax),
                totalCents: toCents(doc.total),
                ...(doc.discount !== undefined
                  ? { discountCents: toCents(doc.discount) }
                  : {}),
                lineItems,
              },
              $unset: { subtotal: "", tax: "", discount: "", total: "" },
            },
          },
        });

        if (batch.length >= BATCH_SIZE) {
          await flushBatch();
        }
      } catch (err) {
        console.error(`Failed to prepare migration for invoice ${doc._id}:`, err);
        errors++;
      }
    }
    await flushBatch();

    console.log(
      `${DRY_RUN ? "[DRY RUN] Would have migrated" : "Migrated"} ${processed} invoice(s). ${errors} skipped due to errors.`,
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
