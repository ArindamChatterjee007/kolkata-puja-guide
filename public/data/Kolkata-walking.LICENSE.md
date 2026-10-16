# Kolkata Walking Graph: Attribution And License

Copyright OpenStreetMap contributors.

This derived street database is made available under the Open Data Commons Open Database License (ODbL) v1.0:
https://opendatacommons.org/licenses/odbl/1-0/

OpenStreetMap copyright, attribution requirements and contributor information:
https://www.openstreetmap.org/copyright

Public source: Geofabrik's Eastern Zone extract, linked from https://download.geofabrik.de/asia/india.html and downloaded through https://download.geofabrik.de/asia/india/eastern-zone-latest.osm.pbf.

The companion kolkata-walking.json records the exact dated download URL, PBF-header snapshot timestamp, fetch/check times, Last-Modified, source SHA-256, XML SHA-256, clipping commands and filtering rules. Snapshot time is not a live-access or festival-closure guarantee.

The derived graph retains original OSM junction IDs, complete street polylines at six decimal places, measured polyline lengths and deduplicated OSM names. Degree-two compression does not create connections at coordinate crossings. Private/no-foot and unsupported access ways are excluded conservatively. Missing OSM restrictions are not proof of public access.

When displaying or redistributing the graph or its map output, retain this notice, provide visible OpenStreetMap contributor attribution with the copyright link, and comply with the ODbL attribution and share-alike requirements. Do not describe estimated hotspot-avoidance routes as live crowd measurements, crowd-free, guaranteed accessible or police-approved.

The regional PBF is a private build input, not a deployed asset. Reproducible processing is implemented in scripts/build-streets.mjs and documented in docs/STREET_DATA.md in the project source.