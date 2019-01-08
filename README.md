# Campus-Map

The goal of the map is to provide information to the students, the biggest of which being walking directions. Prior to this, students only had a static image of the campus map to go by. To make matters worse, there were no maps that showed handicap-accessible routes on campus. That all changed with this map. I personally walked every sidewalk on the campus so I could know which ones were truly accessible. With the data for the sidewalks, the map uses Dijkstra's algorithm to find the shortest path from their starting location to their destination. Users have the option of routing from their current location (using Geolocation) or from a building of their choosing. They also have the ability to request the route uses only handicap-accessible routes.

Aside from directions, the map also has a collection of information that may be otherwise hard to find. Each building has each of these features (when applicable): department website, front desk number, departments inside, and printer location. The map also has parking lot locations with the type of lot (reserved, commuter, etc) and the number of handicap parking spots. All of this information was gathered by the team so the student does not have to search the website (like we did) for the information they need.

Some other functionality includes switching between map view and satellite view, searching for buildings using a Rabin-Karp partial hashing algorithm, and a custom geolocation algorithm for location finding and verification.

The current live map can be seen here: https://daswick.github.io/Campus-Map/map.html

The version of the map with legacy Leaflet, bootstrap, and old sidebar can be found here: https://daswick.github.io/Campus-Map/oldMap/map.html

If you want to see a live map showing all of the features, sidewalks, edges, and connections, the site is https://daswick.github.io/Campus-Map/showSidewalks.html
