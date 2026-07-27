/**
 * One-time backfill for R-31: populates amountCents (and, for the subset
 * of types where all three balance fields are dollars,
 * previousBalanceCents/currentBalanceCents) on existing Transaction
 * documents that predate this field — see models/transactions.ts and
 * lib/transactionMoney.ts.
 *
 * Deliberately narrow: only touches the transaction types confirmed to be
 * genuinely dollar-denominated (seller_income, seller_payout,
 * subscription_payment, subscription_renewal — all three fields; plus
 * units_purchase's `amount` field only, since its previousBalance/
 * currentBalance are a buyer's wallet UNIT count, not dollars). Every
 * other type (lead_purchase, call_purchase, lead_auto_purchase,
 * seller_income_auto_accept, refund, admin_adjustment,
 * subscription_cancellation) is left completely untouched — those either
 * store unit counts already, or their dollar/unit status can't be
 * determined from `type` alone (see refund's handling in the app code,
 * which resolves this at write time by inheriting from the transaction it
 * refunds — not something this backfill can reconstruct retroactively
 * without also loading and cross-referencing every referenced original
 * transaction; left as a manual follow-up if that history matters).
 *
 * Safe to re-run: only touches documents that don't already have
 * amountCents set.
 *
 * Usage:
 *   node scripts/backfill-transaction-cents.js --dry-run
 *   node scripts/backfill-transaction-cents.js
 *
 * Requires MONGODB_URI in the environment.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports -- standalone CommonJS script run via plain `node`, not bundled through the app's ESM/TS build
const { MongoClient } = require("mongodb");

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 500;

// Mirrors lib/transactionMoney.ts — kept in sync manually since this script
// runs outside the Next.js/TypeScript build.
const FULL_DOLLAR_TYPES = new Set([
  "seller_income",
  "seller_payout",
  "subscription_payment",
  "subscription_renewal",
]);
const AMOUNT_ONLY_DOLLAR_TYPES = new Set(["units_purchase"]);

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
    const transactions = db.collection("transactions");

    const filter = {
      type: { $in: [...FULL_DOLLAR_TYPES, ...AMOUNT_ONLY_DOLLAR_TYPES] },
      amountCents: { $exists: false },
    };
    const totalToMigrate = await transactions.countDocuments(filter);
    console.log(
      `${DRY_RUN ? "[DRY RUN] " : ""}Found ${totalToMigrate} transaction(s) needing an amountCents backfill.`,
    );

    if (totalToMigrate === 0) {
      console.log("Nothing to do.");
      return;
    }

    let processed = 0;
    let skipped = 0;
    let batch = [];
    const flushBatch = async () => {
      if (batch.length === 0) return;
      if (!DRY_RUN) {
        await transactions.bulkWrite(batch, { ordered: false });
      }
      processed += batch.length;
      console.log(`Processed ${processed}/${totalToMigrate}...`);
      batch = [];
    };

    const cursor = transactions.find(filter).batchSize(BATCH_SIZE);
    for await (const doc of cursor) {
      if (typeof doc.amount !== "number") {
        console.warn(`Skipping transaction ${doc._id}: amount is not a number.`);
        skipped++;
        continue;
      }

      const update = { amountCents: toCents(doc.amount) };
      if (
        FULL_DOLLAR_TYPES.has(doc.type) &&
        typeof doc.previousBalance === "number" &&
        typeof doc.currentBalance === "number"
      ) {
        update.previousBalanceCents = toCents(doc.previousBalance);
        update.currentBalanceCents = toCents(doc.currentBalance);
      }

      batch.push({
        updateOne: { filter: { _id: doc._id }, update: { $set: update } },
      });

      if (batch.length >= BATCH_SIZE) {
        await flushBatch();
      }
    }
    await flushBatch();

    console.log(
      `${DRY_RUN ? "[DRY RUN] Would have migrated" : "Migrated"} ${processed} transaction(s). ${skipped} skipped.`,
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
