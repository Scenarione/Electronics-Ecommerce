from .db import catalog


def field(label, kind="number", unit="", values=None):
    return {
        "label": label,
        "type": kind,
        "unit": unit,
        "required": True,
        "filterable": True,
        **({"values": values} if values else {}),
    }


CATEGORIES = [
    {
        "_id": "cpu",
        "name": "Processors",
        "attributes": {
            "socket": field("Socket", "string", values=["AM5", "LGA1700"]),
            "cores": field("Cores"),
            "threads": field("Threads"),
            "base_clock": field("Base clock", unit="GHz"),
            "power": field("Power", unit="W"),
        },
    },
    {
        "_id": "gpu",
        "name": "Graphics cards",
        "attributes": {
            "chipset": field("Chipset", "string"),
            "vram": field("Video memory", unit="GB"),
            "memory_type": field("Memory type", "string", values=["GDDR6", "GDDR6X"]),
            "length": field("Card length", unit="mm"),
        },
    },
    {
        "_id": "ram",
        "name": "Memory",
        "attributes": {
            "generation": field("Generation", "string", values=["DDR4", "DDR5"]),
            "capacity": field("Capacity", unit="GB"),
            "modules": field("Module count"),
            "speed": field("Speed", unit="MT/s"),
        },
    },
    {
        "_id": "motherboard",
        "name": "Motherboards",
        "attributes": {
            "socket": field("Socket", "string", values=["AM5", "LGA1700"]),
            "chipset": field("Chipset", "string"),
            "form_factor": field("Form factor", "string", values=["ATX", "Micro-ATX", "Mini-ITX"]),
            "memory_support": field("Memory support", "string", values=["DDR4", "DDR5"]),
        },
    },
    {
        "_id": "monitor",
        "name": "Monitors",
        "attributes": {
            "resolution": field(
                "Resolution", "string", values=["1920x1080", "2560x1440", "3840x2160"]
            ),
            "refresh_rate": field("Refresh rate", unit="Hz"),
            "panel": field("Panel", "string", values=["IPS", "VA", "OLED"]),
            "size": field("Screen size", unit="in"),
        },
    },
    {
        "_id": "laptop",
        "name": "Laptops",
        "attributes": {
            "cpu": field("Processor", "string"),
            "gpu": field("Graphics", "string"),
            "memory": field("Memory", unit="GB"),
            "storage": field("Storage", unit="GB"),
            "display": field("Display", unit="in"),
            "battery": field("Battery", unit="Wh"),
        },
    },
]


def initialize_catalog():
    product_schema = {
        "bsonType": "object",
        "required": [
            "_id",
            "sku",
            "slug",
            "name",
            "brand",
            "category",
            "description",
            "images",
            "specifications",
            "schema_version",
            "created_at",
            "updated_at",
        ],
        "properties": {
            "_id": {"bsonType": "string"},
            "sku": {"bsonType": "string"},
            "slug": {"bsonType": "string"},
            "name": {"bsonType": "string"},
            "brand": {"bsonType": "string"},
            "category": {"enum": [c["_id"] for c in CATEGORIES]},
            "description": {"bsonType": "string"},
            "images": {"bsonType": "array", "items": {"bsonType": "string"}},
            "specifications": {"bsonType": "object"},
            "schema_version": {"bsonType": "int"},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
        "oneOf": [],
    }
    for category in CATEGORIES:
        attributes = category["attributes"]
        product_schema["oneOf"].append(
            {
                "properties": {
                    "category": {"enum": [category["_id"]]},
                    "specifications": {
                        "bsonType": "object",
                        "required": list(attributes),
                        "additionalProperties": False,
                        "properties": {
                            key: {
                                "bsonType": ["int", "long", "double", "decimal"]
                                if value["type"] == "number"
                                else "string",
                                **(
                                    {"minimum": 0}
                                    if value["type"] == "number"
                                    else {"minLength": 1}
                                ),
                                **({"enum": value["values"]} if "values" in value else {}),
                            }
                            for key, value in attributes.items()
                        },
                    },
                }
            }
        )
    definitions_schema = {
        "bsonType": "object",
        "required": ["_id", "name", "attributes"],
        "properties": {
            "_id": {"bsonType": "string"},
            "name": {"bsonType": "string"},
            "attributes": {"bsonType": "object"},
        },
    }
    for name, schema in [
        ("products", product_schema),
        ("category_definitions", definitions_schema),
    ]:
        if name not in catalog.list_collection_names():
            catalog.create_collection(name, validator={"$jsonSchema": schema})
        else:
            catalog.command(
                "collMod", name, validator={"$jsonSchema": schema}, validationLevel="strict"
            )
    catalog.products.create_index("sku", unique=True)
    catalog.products.create_index("slug", unique=True)
    catalog.products.create_index([("category", 1), ("brand", 1), ("_id", 1)])
    catalog.products.create_index([("name", "text"), ("description", "text")])
    for attr in ["socket", "capacity", "vram", "refresh_rate"]:
        catalog.products.create_index([("category", 1), (f"specifications.{attr}", 1)])
    for definition in CATEGORIES:
        catalog.category_definitions.replace_one(
            {"_id": definition["_id"]}, definition, upsert=True
        )


if __name__ == "__main__":
    initialize_catalog()
    print("MongoDB collections, validators, indexes, and category definitions ready.")
