import express, { json } from 'express';
import Graph from 'graphology';
const { MultiGraph } = Graph;
const app = express();

// Data penerbangan dengan informasi tambahan
const flights = [
    { from: "JKT", to: "SUB", flight: 1, airline: "Garuda", duration: 90, departure: "2024-12-08T06:00:00Z", arrival: "2024-12-08T07:00:00Z" },
    { from: "JKT", to: "JOG", flight: 2, airline: "Lion", duration: 85, departure: "2024-12-08T06:30:00Z", arrival: "2024-12-08T08:00:00Z" },
    { from: "SUB", to: "DPS", flight: 3, airline: "Citilink", duration: 70, departure: "2024-12-08T08:00:00Z", arrival: "2024-12-08T09:00:00Z" },
    { from: "JOG", to: "DPS", flight: 4, airline: "AirAsia", duration: 110, departure: "2024-12-08T11:00:00Z", arrival: "2024-12-08T12:30:00Z" },
    { from: "SUB", to: "JOG", flight: 5, airline: "Sriwijaya", duration: 120, departure: "2024-12-08T09:00:00Z", arrival: "2024-12-08T09:45:00Z" },
    { from: "JKT", to: "SUB", flight: 6, airline: "Batik", duration: 75, departure: "2024-12-08T07:00:00Z", arrival: "2024-12-08T08:00:00Z" },
    { from: "JKT", to: "DPS", flight: 7, airline: "Garuda", duration: 200, departure: "2024-12-08T06:45:00Z", arrival: "2023-10-02T09:45:00Z" },
    { from: "JOG", to: "JKT", flight: 8, airline: "Lion", duration: 80, departure: "2024-12-08T08:30:00Z", arrival: "2024-12-08T10:10:00Z" },
];

function createMultiGraph(flights) {
    const multiGraph = new MultiGraph();

    // Tambahkan node unik
    const uniqueNodes = new Set(flights.flatMap(flight => [flight.from, flight.to]));
    uniqueNodes.forEach(node => {
        console.log(node)
        multiGraph.addNode(node)
    }
    );

    // Tambahkan edges dengan informasi detail
    flights.forEach(flight => {
        multiGraph.addEdge(flight.from, flight.to, {
            flight: flight.flight,
            airline: flight.airline,
            duration: flight.duration,
            departure: flight.departure,
            arrival: flight.arrival
        });
    });

    return multiGraph;
}

function findAllPaths(graph, start, end, path = [], visited = new Set()) {
    path = [...path, start];
    visited.add(start);

    if (start === end) {
        return [path];
    }

    let paths = [];

    graph.outNeighbors(start).forEach(neighbor => {
        if (!visited.has(neighbor)) {
            const newPaths = findAllPaths(graph, neighbor, end, path, new Set(visited));
            paths.push(...newPaths);
            
        }
    });

    return paths;
}

function findValidFlights(flights, source, target) {
    return flights
        .filter(flight => flight.from === source && flight.to === target)
        .map(flight => ({
            flight: flight.flight,
            airline: flight.airline,
            duration: flight.duration,
            departure: flight.departure,
            arrival: flight.arrival
        }));
}

function generateFlightCombinations(flightLists) {
    if (flightLists.length === 0) return [[]];

    const [firstList, ...remainingLists] = flightLists;
    const restCombinations = generateFlightCombinations(remainingLists);

    return firstList.flatMap(flight =>
        restCombinations.map(combo => [flight, ...combo])
    );
}

app.use(json());

app.get('/flight-routes', (req, res) => {
    const { start, end, preferredAirline } = req.query;

    if (!start || !end) {
        return res.status(400).json({
            error: 'Parameter start dan end harus disertakan'
        });
    }

    const multiGraph = createMultiGraph(flights);
    const paths = findAllPaths(multiGraph, start, end);

    const processedPaths = paths.map((path) => {
        // console.log(path)
        const flightDetails = path.slice(0, -1).map((node, i) => {
            // console.log(node, i)
            let validFlights = findValidFlights(flights, node, path[i + 1]);
            // console.log(validFlights)
            // Filter berdasarkan airline jika dipilih
            if (preferredAirline) {
                validFlights = validFlights.filter(
                    flight => flight.airline.toLowerCase() === preferredAirline.toLowerCase()
                );
            }

            return validFlights;
        });

        const allFlightCombinations = generateFlightCombinations(flightDetails);

        return allFlightCombinations.map(flightCombo => ({
            path,
            flights: flightCombo
        }));
    }).flat();

    // Tambahkan kalkulasi total durasi
    const routesWithDuration = processedPaths.map((pathInfo, index) => {
        const totalDuration = pathInfo.flights.reduce((sum, flight) => sum + flight.duration, 0);
        // console.log(pathInfo)
        return {
            id: index + 1,
            path: pathInfo.path.join(' → '),
            flights: pathInfo.flights.map(f => `${f.flight} (${f.airline})`).join(', '),
            totalDuration: `${totalDuration} menit`,
            schedule: pathInfo.flights.map(f => `${f.departure} - ${f.arrival}`)
        };
    });

    // console.log(paths)
    res.json({
        totalRoutes: routesWithDuration.length,
        routes: routesWithDuration
    });
});

// Endpoint untuk mendapatkan airlines
app.get('/airlines', (req, res) => {
    const airlines = [...new Set(flights.map(flight => flight.airline))];
    res.json({ airlines });
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});