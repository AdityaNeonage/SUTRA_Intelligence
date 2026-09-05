# Intelligence Fusion Center after login

Open the authenticated console and choose **Intelligence Fusion Center** from the sidebar, or use /live/fusion directly. Direct entry requires login and returns to this route after authentication. The command palette includes the same destination.

The existing interactive map, filters, timeline, network linkage and sample evidence are available inside the authenticated shell. Opening the sample graph or source records stays in that shell; **Back to investigation map** restores the map's selection and filters.

**Data boundary:** authentication does not convert sample data into live evidence. This page explicitly identifies the synthetic dataset. No coordinates are invented for uploaded evidence, and this change adds no geographic ingestion or backend map API. The real **Live Network**, **Evidence Upload** and **Data Store** remain separate backend-connected destinations.

No new dependencies, backend changes, deployment or Git push are included. To publish this local change, deploy the current source from the repository root (or commit/push through your configured deployment workflow); redeploying an older source snapshot will not include it.
