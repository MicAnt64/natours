/* eslint-disable */
// To disable ESLint for this file

export const displayMap = (locations) => {
    // Do an ajax req to get data? we don't have to, since in tour
    // template we have the tour data. So we expose the data in our pug fil

    // Inthe future hide the token
    mapboxgl.accessToken =
        'pk.eyJ1IjoibWljaGFudCIsImEiOiJja2twaWR6MzAwOTBmMndwYXNzdXhyaDQyIn0.T0Socf_SzoSWQjuHovdq1g';

    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/michant/ckkpkb2xb0m6p17ll2wfswrcb',
        scrollZoom: false
        // center: [-118.113491, 34.111745], //need to switch lat long
        // zoom: 10,
        // interactive: false //fixed map
    });

    // Area tha will be displayed on map
    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach((loc) => {
        //Create marker
        const el = document.createElement('div');
        el.className = 'marker';

        // Add marker
        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        })
            .setLngLat(loc.coordinates)
            .addTo(map);

        // Add popup
        new mapboxgl.Popup({
            offset: 30 //px
        })
            .setLngLat(loc.coordinates)
            .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
            .addTo(map);

        // Extend map bounds to include current loc
        bounds.extend(loc.coordinates);
    });

    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100
            // adding padding in px for location bounds in map itself.
        }
    });
};
