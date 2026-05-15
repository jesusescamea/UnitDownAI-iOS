import { getUncachableStripeClient } from './stripeClient';

async function ensureProduct(stripe: any, name: string, description: string, unitAmount: number) {
  const existing = await stripe.products.search({
    query: `name:'${name}' AND active:'true'`,
  });

  let product;
  if (existing.data.length > 0) {
    product = existing.data[0];
    console.log(`Product "${name}" already exists (${product.id})`);
  } else {
    product = await stripe.products.create({ name, description });
    console.log(`Created product: "${name}" (${product.id})`);
  }

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    type: 'recurring',
  });

  const existingPrice = prices.data.find(
    (p: any) => p.unit_amount === unitAmount && p.recurring?.interval === 'month'
  );

  if (existingPrice) {
    console.log(`  Price $${(unitAmount / 100).toFixed(2)}/month already exists (${existingPrice.id})`);
  } else {
    const newPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: unitAmount,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`  Created price $${(unitAmount / 100).toFixed(2)}/month (${newPrice.id})`);
  }
}

async function seedProducts() {
  try {
    const stripe = await getUncachableStripeClient();

    console.log('Seeding UnitDown AI Stripe products...\n');

    await ensureProduct(
      stripe,
      'UnitDown Pro Tech',
      'Unlimited commercial HVAC diagnostics — advanced fault logic, refrigerant SH/SC analysis, electrical control-path meter readings, rooftop unit support, and saved diagnostic history.',
      799
    );

    await ensureProduct(
      stripe,
      'UnitDown Contractor Pro',
      'Everything in Pro Tech plus multi-technician access, shared diagnostic library, and priority support. For growing HVAC companies and service teams.',
      1899
    );

    console.log('\n✓ UnitDown AI products seeded successfully.');
  } catch (err: any) {
    console.error('Error seeding products:', err.message);
    process.exit(1);
  }
}

seedProducts();
