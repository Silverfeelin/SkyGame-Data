# SkyGame-Data

[![npm](https://img.shields.io/npm/v/skygame-data)](https://www.npmjs.com/package/skygame-data)

A fan-made data repository for Sky: Children of the Light. This project contains the raw data that fuels [SkyGame-Planner](https://github.com/Silverfeelin/SkyGame-Planner). The data has been separated to make it easier to consume in other projects. Do note that various bits of data are tightly coupled to the Sky Planner, such as links to image assets contained in that project.

## Package

The data is published as an NPM package together with some useful scripts to parse the data.

https://www.npmjs.com/package/skygame-data

### Versioning

To make sure the format of data doesn't change unexpectedly, this project follows [Semantic Versioning](https://docs.npmjs.com/about-semantic-versioning).

* **Major** versions are incremented when the structure of assets classified as "stable" changes.
* **Minor** versions are incremented when backward-compatible changes are made to the data, or when assets classified as "unstable" are changed.
* **Patch** versions are incremented when data is added or changed without any structural changes to the project.

### CDN

Files from the package can be accessed directly through CDN options such as [unpkg](https://unpkg.com/). Version wildcards can be used.
Below are some examples for the `everything.json` file.

| Version | Link |
|---------|------|
| Latest  | <https://unpkg.com/skygame-data@latest/assets/everything.json> |
| Latest within major 1 | <https://unpkg.com/skygame-data@1.x.x/assets/everything.json> |
| Latest within minor 1.0 | <https://unpkg.com/skygame-data@1.0.x/assets/everything.json> |
| Version 1.0.0 | <https://unpkg.com/skygame-data@1.0.0/assets/everything.json> |


## Assets

**Stable** (see [versioning](#versioning))

```
realms, areas, winged-lights, map-shrines, constellations,
seasons, events, event-instances, event-instance-spirits,
spirits, spirit-trees, spirit-tree-tiers, nodes,
traveling-spirits, returning-spirits,
items, item-lists, shops, iaps
```

**Unstable**

```
candles
```

### Asset GUIDs

The project uses [nanoids](https://github.com/ai/nanoid) of length 10 as GUIDs. When an entity is referenced, its GUID is used in place of the full JSON object. This mechanism can be compared to a foreign key in a database.

**Example**

In `/assets/event-instance-spirits.json`, you'll find various references to spirits:

```jsonc
{ "guid": "ACtiGG4_cq", "spirit": "TgUgZjfoMI", "tree": "EUQHt6adrz" }
```

* `guid`: Unique GUID of this specific JSON object.
* `spirit`: GUID reference to the spirit found in `/assets/spirits.json`.
* `tree`: GUID reference to the spirit tree found in `/assets/spirit-trees.json`.


### Asset location

In the `/src/assets` folder, the data is organized in folders to make it easier to manage within this repository.  
In the package, the contents of these folders are compiled into minified JSON files located at `/assets`.

Data in these files is stored as a JSON object formatted `{ "items": [ ... ] }`.

**Example**  
`/src/assets/events/**` --> `node_modules/skygame-data/assets/events.json`  
`/src/assets/events/**` --> <https://unpkg.com/skygame-data@latest/assets/events.json>

**Everything**  
`/assets/everything.json` contains all data in a single file.

Data in this file is stored as a JSON object formatted as below.

```jsonc
{
  "realms": { "items": [ /*...*/ ] },
  "areas": { "items": [ /*...*/ ] },
  // ...
}
```

## Item IDs

> [!TIP]
> It is recommended to use the GUIDs whenever possible.

All items (`/assets/items.json`) have a unique numeric ID on top of the GUID. This number is used by the Sky Planner in various places, such as encoding a selection of items with Base36 to a fixed length of 3 characters to keep URLs shorter. 

**Example**  

```
https://sky-planner.com/item/unlock-calculator?items=00a00g  
00a --> parseInt('00a', 36) --> ID 10 --> Pointing Candlemaker Hair  
00g --> parseInt('00g', 36) --> ID 16 --> Pointing Candlemaker Outfit
```

## Dates

Dates are stored in the format `YYYY-MM-DD`. Sky: Children of the Light uses the `America/Los_Angeles` timezone for the daily reset, so this timezone should be respected when calculating the actual time an event begins or ends.

## Diagram

The following diagram illustrates which references exist between the data.

References marked in **bold** are stored as GUID reference in the data. For one-to-many relations, an array of GUIDs is used. If no reference exists, the key is omitted from the data.

Circular references are marked in *italic* and are created automatically when parsing the data using the included [Scripts](#scripts).

![Reference diagram](./diagrams/References.jpg)

## Scripts

The project includes some utilities to parse the data into a Javascript object with resolved GUID references. Do note that this data can not be serialized normally due to the circular references in the data, as per the diagram.

TODO

# Discord

If you are or want to be actively involved with this project, feel free to join our Discord:  
http://discord.gg/qjumJY7MKD

## FAQ

**The data isn't accurate, how can I help?**

Since Sky: Children of Light is a live service game with frequent updates, keeping the data up to date and accurate is an ongoing effort.

Simply opening [issues](https://github.com/Silverfeelin/SkyGame-Data/issues) or informing us on our [Discord](#discord) is a good way to help.  
Contributions through pull requests are welcome and very much appreciated.

**Why JSON files?**

The main goal of this project is to provide the data in an accessible and serverless format. This allows projects such as the Sky Planner to be hosted with static assets and not rely on a back-end for fetching data.

## License

[MIT License](LICENSE)
