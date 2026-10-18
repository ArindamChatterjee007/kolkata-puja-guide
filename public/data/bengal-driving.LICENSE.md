# Bengal Motorcar Road Data

Contains information from OpenStreetMap, which is made available here under the Open Database License (ODbL) 1.0.

- Attribution: **OpenStreetMap contributors**.
- Attribution and copyright: https://www.openstreetmap.org/copyright
- Database license: https://opendatacommons.org/licenses/odbl/1-0/
- Individual database contents: https://opendatacommons.org/licenses/dbcl/1-0/
- Public distributor: Geofabrik, https://download.geofabrik.de/asia/india.html
- Retained source: https://download.geofabrik.de/asia/india/eastern-zone-261014.osm.pbf
- OSM snapshot: `2026-10-14T20:21:12Z`.
- Source PBF SHA-256: `b2443fab468183501a9072f4ffa46d6b9c5a4ceea2e54479a51d8aec43a755b1`.

The numbered `bengal-driving-*.json` files and `bengal-driving.manifest.json` form a derived, filtered road database. Preserve this notice and attribution when redistributing it. Public use and redistribution of an adapted database are subject to the ODbL attribution, share-alike and database-access requirements. The chunks provide the actual adapted database, not just a picture of it.

The graph is filtered for ordinary motorcars, directed by retained access and one-way tags, compacted at degree-two points while retaining original geometry, and conservatively restricted at unsupported or malformed turn relations. OSM node identity is preserved at graph junctions. Full build instructions, coverage, schema, restrictions and reproducible hashes are in `docs/DRIVING_DATA.md` and `scripts/build-driving.mjs` in the source distribution.

The accompanying `bengal-driving.benchmark.json` is a local engineering measurement using public named-place coordinates, not a traffic, journey-time, legal-access or mobile-performance guarantee. It contains no private origin, GPS history or account information.

Road data is a snapshot, not permission to drive. Signs, current law, police directions, closures, physical access and vehicle restrictions take precedence. Parking, gates and final off-road walking are not verified. No live traffic, navigation-safety or map-completeness warranty is provided.