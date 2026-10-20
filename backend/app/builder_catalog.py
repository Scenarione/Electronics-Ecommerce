"""Catalog and database synchronization for 3D PC Builder hardware components."""

from decimal import Decimal
from uuid import UUID

from .models import Inventory, SellableItem

BUILDER_PARTS: dict[str, dict] = {
    "3e821709-c2fa-59d1-b570-d0d55483e428": {
        "legacy_id": "cpu-9950x3d",
        "category": "cpu",
        "name": "AMD Ryzen 9 9950X3D",
        "brand": "AMD",
        "sku": "100-100001279WOF",
        "slug": "amd-ryzen-9-9950x3d",
        "price": Decimal("26500.00"),
        "tdp": 170,
        "socket": "AM5",
        "specs": {"Cores": "16C / 32T", "Boost": "5.7 GHz", "Cache": "144MB 3D V-Cache"},
        "description": "AMD Ryzen 9 9950X3D flagship processor with 3D V-Cache technology.",
    },
    "f4dd78b2-5927-5eac-8d97-09a6ab59587f": {
        "legacy_id": "cpu-14900ks",
        "category": "cpu",
        "name": "Intel Core i9-14900KS",
        "brand": "Intel",
        "sku": "BX8071514900KS",
        "slug": "intel-core-i9-14900ks",
        "price": Decimal("27900.00"),
        "tdp": 253,
        "socket": "LGA1700",
        "specs": {"Cores": "24C / 32T", "Boost": "6.2 GHz", "Cache": "36MB SmartCache"},
        "description": "Intel Core i9-14900KS special edition desktop processor reaching 6.2 GHz.",
    },
    "fc437841-8134-599c-9385-995430a3e181": {
        "legacy_id": "cpu-7800x3d",
        "category": "cpu",
        "name": "AMD Ryzen 7 7800X3D",
        "brand": "AMD",
        "sku": "100-100000910WOF",
        "slug": "amd-ryzen-7-7800x3d",
        "price": Decimal("16900.00"),
        "tdp": 120,
        "socket": "AM5",
        "specs": {"Cores": "8C / 16T", "Boost": "5.0 GHz", "Cache": "104MB 3D V-Cache"},
        "description": "AMD Ryzen 7 7800X3D ultimate gaming processor with 3D V-Cache.",
    },
    "45f05cf7-74af-5b96-b9be-9ee292b9d843": {
        "legacy_id": "cpu-14700k",
        "category": "cpu",
        "name": "Intel Core i7-14700K",
        "brand": "Intel",
        "sku": "BX8071514700K",
        "slug": "intel-core-i7-14700k",
        "price": Decimal("15900.00"),
        "tdp": 253,
        "socket": "LGA1700",
        "specs": {"Cores": "20C / 28T", "Boost": "5.6 GHz", "Cache": "33MB SmartCache"},
        "description": "Intel Core i7-14700K 20-core desktop processor.",
    },
    "2d6cfb3c-ea4d-561b-96f1-4ac8c09586c2": {
        "legacy_id": "mb-x670e-hero",
        "category": "motherboard",
        "name": "ASUS ROG Crosshair X670E Hero",
        "brand": "ASUS",
        "sku": "ROG-X670E-HERO",
        "slug": "asus-rog-crosshair-x670e-hero",
        "price": Decimal("23900.00"),
        "tdp": 60,
        "socket": "AM5",
        "specs": {"Chipset": "AMD X670E", "PCIe": "Gen 5.0 x16", "Memory": "DDR5-6400+"},
        "description": "ASUS ROG Crosshair X670E Hero premium AMD AM5 motherboard.",
    },
    "4ff78ff6-06b6-5c01-b51f-3200654c04b4": {
        "legacy_id": "mb-z790-dark",
        "category": "motherboard",
        "name": "ASUS ROG Maximus Z790 Dark Hero",
        "brand": "ASUS",
        "sku": "ROG-Z790-DARK",
        "slug": "asus-rog-maximus-z790-dark-hero",
        "price": Decimal("25500.00"),
        "tdp": 65,
        "socket": "LGA1700",
        "specs": {"Chipset": "Intel Z790", "PCIe": "Gen 5.0 x16", "Memory": "DDR5-8000+"},
        "description": "ASUS ROG Maximus Z790 Dark Hero enthusiast Intel motherboard.",
    },
    "452f24db-df5c-587c-a3b1-0eaefa41f7fb": {
        "legacy_id": "mb-b650-tomahawk",
        "category": "motherboard",
        "name": "MSI MAG B650 Tomahawk WiFi",
        "brand": "MSI",
        "sku": "MAG-B650-TOMAHAWK",
        "slug": "msi-mag-b650-tomahawk-wifi",
        "price": Decimal("8490.00"),
        "tdp": 50,
        "socket": "AM5",
        "specs": {"Chipset": "AMD B650", "PCIe": "Gen 4.0 x16", "Memory": "DDR5-6000"},
        "description": "MSI MAG B650 Tomahawk WiFi high-durability gaming motherboard.",
    },
    "db114746-9db1-5869-80f1-862340af5c9e": {
        "legacy_id": "mb-z790-aorus",
        "category": "motherboard",
        "name": "Gigabyte Z790 AORUS Elite AX",
        "brand": "Gigabyte",
        "sku": "GIGA-Z790-ELITE",
        "slug": "gigabyte-z790-aorus-elite-ax",
        "price": Decimal("9900.00"),
        "tdp": 55,
        "socket": "LGA1700",
        "specs": {"Chipset": "Intel Z790", "PCIe": "Gen 5.0 x16", "Memory": "DDR5-7600"},
        "description": "Gigabyte Z790 AORUS Elite AX feature-packed motherboard.",
    },
    "b511b224-430a-5bdd-ada6-ee7ec6076f96": {
        "legacy_id": "gpu-4090-strix",
        "category": "gpu",
        "name": "ASUS ROG Strix GeForce RTX 4090 OC",
        "brand": "ASUS",
        "sku": "ROG-STRIX-RTX4090-O24G",
        "slug": "asus-rog-strix-geforce-rtx-4090-oc",
        "price": Decimal("74900.00"),
        "tdp": 450,
        "specs": {"VRAM": "24GB GDDR6X", "Architecture": "Ada Lovelace", "Slots": "3.5 Slot"},
        "description": "ASUS ROG Strix GeForce RTX 4090 24GB GDDR6X flagship graphics card.",
    },
    "230b8f75-8ddb-5fe7-b106-64539226c183": {
        "legacy_id": "gpu-7900xtx-nitro",
        "category": "gpu",
        "name": "Sapphire Nitro+ Radeon RX 7900 XTX",
        "brand": "Sapphire",
        "sku": "11322-01-20G",
        "slug": "sapphire-nitro-plus-radeon-rx-7900-xtx",
        "price": Decimal("41900.00"),
        "tdp": 355,
        "specs": {"VRAM": "24GB GDDR6", "Architecture": "RDNA 3", "Cooling": "Tri-X Fans"},
        "description": "Sapphire Nitro+ Radeon RX 7900 XTX 24GB top-tier AMD graphics card.",
    },
    "b1b532c7-c517-54f1-b2a5-d9f4c0a4779d": {
        "legacy_id": "gpu-4080s-proart",
        "category": "gpu",
        "name": "ASUS ProArt GeForce RTX 4080 SUPER",
        "brand": "ASUS",
        "sku": "PROART-RTX4080S-O16G",
        "slug": "asus-proart-geforce-rtx-4080-super",
        "price": Decimal("43500.00"),
        "tdp": 320,
        "specs": {"VRAM": "16GB GDDR6X", "Architecture": "Ada Lovelace", "Slots": "2.5 Slot"},
        "description": "ASUS ProArt GeForce RTX 4080 SUPER sleek creator graphics card.",
    },
    "ae6b38f2-74ff-529d-ba90-d1893ad07d80": {
        "legacy_id": "gpu-7800xt-pulse",
        "category": "gpu",
        "name": "Sapphire Pulse Radeon RX 7800 XT",
        "brand": "Sapphire",
        "sku": "11330-02-20G",
        "slug": "sapphire-pulse-radeon-rx-7800-xt",
        "price": Decimal("19900.00"),
        "tdp": 263,
        "specs": {"VRAM": "16GB GDDR6", "Architecture": "RDNA 3", "Cooling": "Dual-X"},
        "description": "Sapphire Pulse Radeon RX 7800 XT 16GB efficient high-performance GPU.",
    },
    "8383a7e7-9512-528a-addb-62e929701fa7": {
        "legacy_id": "cooler-ryujin-360",
        "category": "cooler",
        "name": "ASUS ROG Ryujin III 360 ARGB",
        "brand": "ASUS",
        "sku": "ROG-RYUJIN-III-360",
        "slug": "asus-rog-ryujin-iii-360-argb",
        "price": Decimal("13900.00"),
        "tdp": 15,
        "specs": {"Type": "360mm Liquid AIO", "Pump": "Asetek 8th Gen", "Screen": "3.5 LCD Panel"},
        "description": "ASUS ROG Ryujin III 360 ARGB premium liquid cooler with 3.5 LCD screen.",
    },
    "f025f984-fd5f-5143-a651-9a84a98c7196": {
        "legacy_id": "cooler-kraken-elite",
        "category": "cooler",
        "name": "NZXT Kraken Elite 360 RGB",
        "brand": "NZXT",
        "sku": "RL-KR36E-B1",
        "slug": "nzxt-kraken-elite-360-rgb",
        "price": Decimal("10900.00"),
        "tdp": 12,
        "specs": {"Type": "360mm Liquid AIO", "Pump": "Custom High-Flow", "Screen": "2.36 LCD"},
        "description": "NZXT Kraken Elite 360 RGB high-performance liquid cooler.",
    },
    "b1004ae0-2863-5a43-9c6c-95c340d85ecd": {
        "legacy_id": "cooler-nh-d15",
        "category": "cooler",
        "name": "Noctua NH-D15 chromax.black",
        "brand": "Noctua",
        "sku": "NH-D15-CH-BK",
        "slug": "noctua-nh-d15-chromax-black",
        "price": Decimal("4590.00"),
        "tdp": 5,
        "specs": {"Type": "Dual-Tower Air Cooler", "Heatpipes": "6x Copper", "Fans": "2x 140mm"},
        "description": "Noctua NH-D15 chromax.black legendary dual-tower air cooler.",
    },
    "0655a597-cb15-5eec-af24-039b3b86c07d": {
        "legacy_id": "ram-trident-z5",
        "category": "ram",
        "name": "G.Skill Trident Z5 RGB 64GB DDR5-6400",
        "brand": "G.Skill",
        "sku": "F5-6400J3239G32GX2-TZ5RK",
        "slug": "gskill-trident-z5-rgb-64gb-ddr5-6400",
        "price": Decimal("8990.00"),
        "tdp": 15,
        "specs": {"Capacity": "64GB (2x32GB)", "Speed": "DDR5-6400 CL32", "Voltage": "1.40V"},
        "description": "G.Skill Trident Z5 RGB 64GB DDR5 high-speed dual-channel memory kit.",
    },
    "d6038a6c-40e9-5685-9b0a-dc9848e43a4e": {
        "legacy_id": "ram-dominator-titanium",
        "category": "ram",
        "name": "Corsair Dominator Titanium 64GB DDR5-6600",
        "brand": "Corsair",
        "sku": "CMP64GX5M2B6600C32",
        "slug": "corsair-dominator-titanium-64gb-ddr5-6600",
        "price": Decimal("11500.00"),
        "tdp": 16,
        "specs": {"Capacity": "64GB (2x32GB)", "Speed": "DDR5-6600 CL32", "Cooling": "Patented DHX"},
        "description": "Corsair Dominator Titanium 64GB DDR5-6600 luxury memory kit.",
    },
    "17bce453-13a6-58fe-a241-06c881e35e80": {
        "legacy_id": "ram-fury-beast",
        "category": "ram",
        "name": "Kingston Fury Beast RGB 32GB DDR5-6000",
        "brand": "Kingston",
        "sku": "KF560C36BBEAK2-32",
        "slug": "kingston-fury-beast-rgb-32gb-ddr5-6000",
        "price": Decimal("4990.00"),
        "tdp": 12,
        "specs": {"Capacity": "32GB (2x16GB)", "Speed": "DDR5-6000 CL36", "Voltage": "1.35V"},
        "description": "Kingston Fury Beast RGB 32GB DDR5-6000 gaming memory kit.",
    },
    "bbecf3ae-4800-57cd-86d6-616b41739c57": {
        "legacy_id": "ssd-990-pro-2tb",
        "category": "storage",
        "name": "Samsung 990 PRO 2TB PCIe 4.0 NVMe",
        "brand": "Samsung",
        "sku": "MZ-V9P2T0BW",
        "slug": "samsung-990-pro-2tb-pcie-4-nvme",
        "price": Decimal("6990.00"),
        "tdp": 8,
        "specs": {"Read": "7,450 MB/s", "Write": "6,900 MB/s", "Form": "M.2 2280"},
        "description": "Samsung 990 PRO 2TB PCIe 4.0 NVMe flagship solid-state drive.",
    },
    "71429aeb-47a2-5cec-9e18-11bdabb7f633": {
        "legacy_id": "ssd-sn850x-2tb",
        "category": "storage",
        "name": "WD_BLACK SN850X 2TB NVMe SSD",
        "brand": "WD_BLACK",
        "sku": "WDS200T2X0E",
        "slug": "wd-black-sn850x-2tb-nvme-ssd",
        "price": Decimal("6490.00"),
        "tdp": 8,
        "specs": {"Read": "7,300 MB/s", "Write": "6,600 MB/s", "Form": "M.2 2280"},
        "description": "WD_BLACK SN850X 2TB NVMe SSD extreme performance storage.",
    },
    "0dae6b52-197c-5d0c-990b-4c832d9edfa0": {
        "legacy_id": "psu-prime-tx1000",
        "category": "psu",
        "name": "Seasonic PRIME TX-1000 1000W Titanium",
        "brand": "Seasonic",
        "sku": "PRIME-TX-1000",
        "slug": "seasonic-prime-tx-1000-1000w-titanium",
        "price": Decimal("12900.00"),
        "tdp": 0,
        "wattage": 1000,
        "specs": {"Efficiency": "80 PLUS Titanium", "Modularity": "Fully Modular", "Fan": "135mm FDB"},
        "description": "Seasonic PRIME TX-1000 1000W 80 PLUS Titanium power supply.",
    },
    "054804f4-9c19-5636-8483-46817c9d0e16": {
        "legacy_id": "psu-darkpower-1300",
        "category": "psu",
        "name": "be quiet! Dark Power Pro 13 1300W",
        "brand": "be quiet!",
        "sku": "BN331",
        "slug": "be-quiet-dark-power-pro-13-1300w",
        "price": Decimal("15900.00"),
        "tdp": 0,
        "wattage": 1300,
        "specs": {"Efficiency": "80 PLUS Titanium", "Modularity": "Fully Modular", "ATX": "ATX 3.0 PCIe 5.0"},
        "description": "be quiet! Dark Power Pro 13 1300W titanium power supply unit.",
    },
    "e697fbc3-6d37-51cb-88c2-9caf19bc7021": {
        "legacy_id": "psu-rm850x",
        "category": "psu",
        "name": "Corsair RM850x 850W Gold Modular",
        "brand": "Corsair",
        "sku": "CP-9020200-NA",
        "slug": "corsair-rm850x-850w-gold-modular",
        "price": Decimal("5290.00"),
        "tdp": 0,
        "wattage": 850,
        "specs": {"Efficiency": "80 PLUS Gold", "Modularity": "Fully Modular"},
        "description": "Corsair RM850x 850W 80 PLUS Gold fully modular power supply.",
    },
}

LEGACY_BUILDER_ID_MAP: dict[str, str] = {
    part["legacy_id"]: uuid_str for uuid_str, part in BUILDER_PARTS.items()
}


def ensure_builder_item(db, item_id: UUID | str) -> SellableItem | None:
    uuid_str = str(item_id)
    if uuid_str not in BUILDER_PARTS:
        return None
    part = BUILDER_PARTS[uuid_str]
    real_uuid = UUID(uuid_str)
    item = db.get(SellableItem, real_uuid)
    if not item:
        item = SellableItem(
            id=real_uuid,
            sku=part["sku"],
            price=part["price"],
            currency="THB",
            active=True,
            catalog_pending=False,
            creation_hash="builder-seed",
        )
        db.add(item)
        db.flush()
        db.add(Inventory(item_id=real_uuid, quantity=1000))
        db.flush()
    else:
        if not item.active or item.catalog_pending:
            item.active = True
            item.catalog_pending = False
            db.flush()
        stock = db.get(Inventory, real_uuid)
        if not stock:
            db.add(Inventory(item_id=real_uuid, quantity=1000))
            db.flush()
        elif stock.quantity < 50:
            stock.quantity = 1000
            db.flush()
    return item


def ensure_all_builder_items(db) -> None:
    for uuid_str in BUILDER_PARTS:
        ensure_builder_item(db, uuid_str)
    db.commit()
