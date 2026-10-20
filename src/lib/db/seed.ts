import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "@/lib/auth/password";
import { DEMO_PASSWORD } from "@/lib/money";

interface SeedItem {
  id: string;
  name: string;
  description: string;
  price: number;
  tags: string;
  image: string;
  available?: boolean;
}

interface SeedZone {
  id: string;
  name: string;
  fee: number;
}

interface SeedVendor {
  ownerId: string;
  id: string;
  slug: string;
  name: string;
  ownerName: string;
  email: string;
  description: string;
  address: string;
  whatsapp: string;
  hours: string;
  emoji: string;
  image: string;
  accepting: boolean;
  zones: SeedZone[];
  items: SeedItem[];
}

const VENDORS: SeedVendor[] = [
  {
    ownerId: "usr_mama",
    id: "ven_mama",
    slug: "mama-ngozi-kitchen",
    name: "Mama Ngozi's Kitchen",
    ownerName: "Ngozi Adah",
    email: "mama@demo.orderdesk",
    description:
      "Home-style jollof, fried rice and charcoal-grilled chicken, cooked fresh every morning beside Otukpo main market.",
    address: "12 Market Road, Otukpo",
    whatsapp: "2348012345671",
    hours: "Mon–Sat · 9:00–21:00",
    emoji: "🍲",
    image: "/food/rice.svg",
    accepting: true,
    zones: [
      { id: "zn_mama_campus", name: "Campus Area", fee: 400 },
      { id: "zn_mama_town", name: "Otukpo Town", fee: 700 },
      { id: "zn_mama_outskirts", name: "Outskirts", fee: 1000 },
    ],
    items: [
      {
        id: "mi_mama_combo",
        name: "Rice & Chicken Combo",
        description: "Jollof or fried rice, one grilled chicken lap and fresh salad.",
        price: 2750,
        tags: "rice chicken combo lunch jollof",
        image: "/food/rice.svg",
      },
      {
        id: "mi_mama_jollof",
        name: "Jollof Rice Plate",
        description: "Smoky jollof rice with fried plantain.",
        price: 2000,
        tags: "rice jollof plantain",
        image: "/food/rice.svg",
      },
      {
        id: "mi_mama_fried_rice",
        name: "Fried Rice & Chicken",
        description: "Fried rice with a grilled chicken lap.",
        price: 2900,
        tags: "rice chicken fried",
        image: "/food/rice.svg",
      },
      {
        id: "mi_mama_chicken",
        name: "Grilled Chicken (quarter)",
        description: "Charcoal-grilled chicken with pepper sauce.",
        price: 1800,
        tags: "chicken grill protein",
        image: "/food/chicken.svg",
      },
      {
        id: "mi_mama_water",
        name: "Bottled Water",
        description: "Chilled 75cl bottle.",
        price: 300,
        tags: "drink water",
        image: "/food/drink.svg",
      },
      {
        id: "mi_mama_salad",
        name: "Extra Salad",
        description: "Fresh cabbage, carrot and cucumber side.",
        price: 500,
        tags: "salad side",
        image: "/food/salad.svg",
      },
    ],
  },
  {
    ownerId: "usr_grill",
    id: "ven_grill",
    slug: "otukpo-grill-house",
    name: "Otukpo Grill House",
    ownerName: "Emeka Odeh",
    email: "grill@demo.orderdesk",
    description:
      "Charcoal suya, peppered gizzard and grilled tilapia, made to order and wrapped hot.",
    address: "5 High Level Road, Otukpo",
    whatsapp: "2348023456782",
    hours: "Daily · 16:00–23:00",
    emoji: "🍢",
    image: "/food/suya.svg",
    accepting: true,
    zones: [
      { id: "zn_grill_campus", name: "Campus Area", fee: 500 },
      { id: "zn_grill_town", name: "Otukpo Town", fee: 800 },
    ],
    items: [
      {
        id: "mi_grill_suya_wrap",
        name: "Beef Suya Wrap",
        description: "Spicy beef suya, onions and tomatoes in a warm wrap.",
        price: 2500,
        tags: "suya beef wrap",
        image: "/food/suya.svg",
      },
      {
        id: "mi_grill_platter",
        name: "Suya Platter (for two)",
        description: "Beef suya, gizzard and onions on a shared platter.",
        price: 4200,
        tags: "suya platter sharing",
        image: "/food/suya.svg",
      },
      {
        id: "mi_grill_gizzard",
        name: "Peppered Gizzard",
        description: "Gizzard tossed in fiery pepper sauce.",
        price: 3000,
        tags: "gizzard pepper",
        image: "/food/chicken.svg",
      },
      {
        id: "mi_grill_tilapia",
        name: "Grilled Tilapia",
        description: "Whole tilapia grilled with spice and served with onions.",
        price: 3800,
        tags: "fish tilapia grill",
        image: "/food/fish.svg",
      },
      {
        id: "mi_grill_coke",
        name: "Chilled Coke",
        description: "50cl bottle.",
        price: 300,
        tags: "drink coke",
        image: "/food/drink.svg",
      },
    ],
  },
  {
    ownerId: "usr_burger",
    id: "ven_burger",
    slug: "campus-burger-and-chips",
    name: "Campus Burger & Chips",
    ownerName: "Tunde Akpan",
    email: "burger@demo.orderdesk",
    description:
      "Burgers, loaded fries and thick shakes, two minutes from the campus gate.",
    address: "Campus Gate, Otukpo",
    whatsapp: "2348034567893",
    hours: "Mon–Sun · 10:00–22:00",
    emoji: "🍔",
    image: "/food/burger.svg",
    accepting: true,
    zones: [
      { id: "zn_burger_campus", name: "Campus Area", fee: 300 },
      { id: "zn_burger_town", name: "Otukpo Town", fee: 700 },
    ],
    items: [
      {
        id: "mi_burger_classic",
        name: "Classic Beef Burger",
        description: "Beef patty, lettuce, tomato and house sauce.",
        price: 2200,
        tags: "burger beef",
        image: "/food/burger.svg",
      },
      {
        id: "mi_burger_double",
        name: "Double Beef Burger",
        description: "Two patties, double cheese and pickles.",
        price: 3300,
        tags: "burger beef cheese",
        image: "/food/burger.svg",
      },
      {
        id: "mi_burger_chicken",
        name: "Chicken Burger",
        description: "Crispy chicken fillet with coleslaw.",
        price: 2500,
        tags: "burger chicken",
        image: "/food/burger.svg",
      },
      {
        id: "mi_burger_fries",
        name: "Loaded Fries",
        description: "Fries topped with cheese sauce and beef bits.",
        price: 1800,
        tags: "fries chips side",
        image: "/food/fries.svg",
      },
      {
        id: "mi_burger_shake",
        name: "Vanilla Milkshake",
        description: "Thick, cold and made to order.",
        price: 1200,
        tags: "shake drink vanilla",
        image: "/food/shake.svg",
      },
      {
        id: "mi_burger_combo",
        name: "Burger Combo",
        description: "Classic burger, regular fries and a soft drink.",
        price: 3900,
        tags: "burger combo fries drink",
        image: "/food/burger.svg",
      },
    ],
  },
  {
    ownerId: "usr_idoma",
    id: "ven_idoma",
    slug: "idoma-delicacy-pot",
    name: "Idoma Delicacy Pot",
    ownerName: "Amina Onah",
    email: "idoma@demo.orderdesk",
    description:
      "Pounded yam, egusi and traditional Idoma soups, served the way home tastes.",
    address: "8 Ochekwu Street, Otukpo",
    whatsapp: "2348045678904",
    hours: "Mon–Sat · 11:00–20:00",
    emoji: "🥘",
    image: "/food/yam.svg",
    accepting: true,
    zones: [
      { id: "zn_idoma_town", name: "Otukpo Town", fee: 600 },
      { id: "zn_idoma_outskirts", name: "Outskirts", fee: 900 },
    ],
    items: [
      {
        id: "mi_idoma_egusi",
        name: "Pounded Yam & Egusi",
        description: "Smooth pounded yam with egusi and assorted meat.",
        price: 2600,
        tags: "pounded yam egusi swallow",
        image: "/food/yam.svg",
      },
      {
        id: "mi_idoma_ogbono",
        name: "Pounded Yam & Ogbono",
        description: "Pounded yam with drawy ogbono soup.",
        price: 2600,
        tags: "pounded yam ogbono swallow",
        image: "/food/yam.svg",
      },
      {
        id: "mi_idoma_semo",
        name: "Semo & Okra",
        description: "Semo with fresh okra and palm oil.",
        price: 2400,
        tags: "semo okra swallow",
        image: "/food/yam.svg",
      },
      {
        id: "mi_idoma_meat",
        name: "Assorted Meat",
        description: "Extra portion of peppered assorted meat.",
        price: 1500,
        tags: "meat side",
        image: "/food/chicken.svg",
      },
      {
        id: "mi_idoma_zobo",
        name: "Chilled Zobo",
        description: "House hibiscus drink, lightly spiced.",
        price: 500,
        tags: "drink zobo",
        image: "/food/drink.svg",
      },
    ],
  },
  {
    ownerId: "usr_sunrise",
    id: "ven_sunrise",
    slug: "sunrise-pastries",
    name: "Sunrise Pastries & Shawarma",
    ownerName: "Blessing Eje",
    email: "sunrise@demo.orderdesk",
    description:
      "Fresh meat pies, chin chin and chicken shawarma. Currently paused while the kitchen restocks.",
    address: "20 Otukpo–Enugu Road, Otukpo",
    whatsapp: "2348056789015",
    hours: "Mon–Sun · 8:00–20:00",
    emoji: "🥙",
    image: "/food/shawarma.svg",
    accepting: false,
    zones: [
      { id: "zn_sunrise_campus", name: "Campus Area", fee: 350 },
      { id: "zn_sunrise_town", name: "Otukpo Town", fee: 650 },
    ],
    items: [
      {
        id: "mi_sunrise_chicken_sw",
        name: "Chicken Shawarma",
        description: "Grilled chicken, cabbage and sauce in a toasted wrap.",
        price: 2000,
        tags: "shawarma chicken wrap",
        image: "/food/shawarma.svg",
      },
      {
        id: "mi_sunrise_beef_sw",
        name: "Beef Shawarma",
        description: "Spiced beef strips with onions and chilli sauce.",
        price: 2200,
        tags: "shawarma beef wrap",
        image: "/food/shawarma.svg",
      },
      {
        id: "mi_sunrise_pie",
        name: "Meat Pie",
        description: "Flaky pastry with minced meat and potato.",
        price: 700,
        tags: "pastry pie snack",
        image: "/food/pastry.svg",
      },
      {
        id: "mi_sunrise_chinchin",
        name: "Chin Chin (pack)",
        description: "Crunchy fried dough snack, 200g pack.",
        price: 1000,
        tags: "snack chin chin",
        image: "/food/pastry.svg",
      },
      {
        id: "mi_sunrise_doughnut",
        name: "Glazed Doughnut",
        description: "Soft doughnut with a light sugar glaze.",
        price: 500,
        tags: "pastry doughnut snack",
        image: "/food/pastry.svg",
      },
    ],
  },
];

export function seedDatabase(db: DatabaseSync): void {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM users").get() as {
    n: number;
  };
  if (existing.n > 0) return;

  const now = new Date().toISOString();
  const passwordHash = hashPassword(DEMO_PASSWORD);

  const insertUser = db.prepare(
    "INSERT INTO users (id, email, password_hash, display_name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertVendor = db.prepare(
    `INSERT INTO vendors
      (id, owner_id, slug, name, description, category, city, address, whatsapp, opening_hours,
       accepting_orders, published_at, emoji, image_url, is_sample, created_at)
     VALUES (?, ?, ?, ?, ?, 'Fast food', 'Otukpo', ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  );
  const insertZone = db.prepare(
    "INSERT INTO delivery_zones (id, vendor_id, name, fee_kobo, active) VALUES (?, ?, ?, ?, 1)",
  );
  const insertItem = db.prepare(
    `INSERT INTO menu_items
      (id, vendor_id, name, description, tags, image_url, price_kobo, available, archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
  );

  db.exec("BEGIN IMMEDIATE");
  try {
    insertUser.run(
      "usr_customer",
      "customer@demo.orderdesk",
      passwordHash,
      "Ada Customer",
      "08030000001",
      now,
    );

    for (const vendor of VENDORS) {
      insertUser.run(
        vendor.ownerId,
        vendor.email,
        passwordHash,
        vendor.ownerName,
        null,
        now,
      );
      insertVendor.run(
        vendor.id,
        vendor.ownerId,
        vendor.slug,
        vendor.name,
        vendor.description,
        vendor.address,
        vendor.whatsapp,
        vendor.hours,
        vendor.accepting ? 1 : 0,
        now,
        vendor.emoji,
        vendor.image,
        now,
      );
      for (const zone of vendor.zones) {
        insertZone.run(zone.id, vendor.id, zone.name, zone.fee * 100);
      }
      for (const item of vendor.items) {
        insertItem.run(
          item.id,
          vendor.id,
          item.name,
          item.description,
          item.tags,
          item.image,
          item.price * 100,
          item.available === false ? 0 : 1,
          now,
        );
      }
    }

    const insertAccount = db.prepare(
      `INSERT INTO wallet_accounts (id, owner_user_id, vendor_id, account_kind, currency, mode, balance_kobo)
       VALUES (?, ?, ?, ?, 'NGN', 'demo', ?)`,
    );
    insertAccount.run("wa_demo_source", null, null, "demo_source", -2_500_000);
    insertAccount.run("wa_demo_clearing", null, null, "demo_clearing", 0);
    insertAccount.run("wa_customer", "usr_customer", null, "customer", 2_500_000);
    for (const vendor of VENDORS) {
      insertAccount.run(
        `wa_payable_${vendor.id}`,
        null,
        vendor.id,
        "vendor_payable",
        0,
      );
    }

    const insertTx = db.prepare(
      `INSERT INTO ledger_transactions (id, kind, initiator_user_id, operation_key, request_hash, order_id, note, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`,
    );
    insertTx.run(
      "tx_seed_topup",
      "demo_top_up",
      "usr_customer",
      "seed:customer-top-up",
      "Seed funding for the demo customer wallet",
      now,
    );
    const insertEntry = db.prepare(
      "INSERT INTO ledger_entries (id, transaction_id, account_id, amount_kobo) VALUES (?, ?, ?, ?)",
    );
    insertEntry.run("le_seed_1", "tx_seed_topup", "wa_demo_source", -2_500_000);
    insertEntry.run("le_seed_2", "tx_seed_topup", "wa_customer", 2_500_000);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
