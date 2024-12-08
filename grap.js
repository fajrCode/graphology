
import express, { json } from 'express';
import Graph from 'graphology';
const app = express();

// Data penerbangan
const flights = [
    { from: "JKT", to: "SUB", flight: 1 },
    { from: "JKT", to: "JOG", flight: 2 },
    { from: "SUB", to: "DPS", flight: 3 },
    { from: "JOG", to: "DPS", flight: 4 },
    { from: "SUB", to: "JOG", flight: 5 },
    { from: "JKT", to: "SUB", flight: 6 },
    { from: "JKT", to: "DPS", flight: 7 },
    { from: "JOG", to: "JKT", flight: 8 }
];

// Fungsi pencarian jalur
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

// Fungsi mencari penerbangan valid
function findValidFlightsBetweenNodes(flights, source, target) {
    return flights
        .filter(flight => flight.from === source && flight.to === target)
        .map(flight => flight.flight);
}

// Fungsi generate kombinasi penerbangan
function generateFlightCombinations(flightLists) {
    if (flightLists.length === 0) return [[]];

    const [firstList, ...remainingLists] = flightLists;
    const restCombinations = generateFlightCombinations(remainingLists);

    return firstList.flatMap(flight => 
        restCombinations.map(combo => [flight, ...combo])
    );
}

// Middleware untuk parsing JSON
app.use(json());

// Rute untuk pencarian jalur penerbangan
app.get('/flight-routes', (req, res) => {
    const { start, end } = req.query;

    // Validasi input
    if (!start || !end) {
        return res.status(400).json({ 
            error: 'Parameter start dan end harus disertakan' 
        });
    }

    // Membuat graph
    const graph = new Graph({ multi: true });

    // Mengumpulkan unique nodes
    const uniqueNodes = new Set(flights.flatMap(flight => [flight.from, flight.to]));

    // Menambahkan node
    uniqueNodes.forEach(node => graph.addNode(node));

    // Menambahkan edge dari flights
    flights.forEach(flight => {
        graph.addEdge(flight.from, flight.to, { 
            flight: flight.flight 
        });
    });

    // Mencari semua jalur
    const paths = findAllPaths(graph, start, end);

    // Proses jalur
    const processedPaths = paths.map((path) => {
        // Temukan nomor penerbangan untuk setiap segmen jalur
        const flightNumbers = path.slice(0, -1).map((node, i) => {
            return findValidFlightsBetweenNodes(flights, node, path[i + 1]);
        });

        // Hasilkan semua kombinasi penerbangan
        const allFlightCombinations = generateFlightCombinations(flightNumbers);

        return allFlightCombinations.map(flightCombo => ({
            path,
            flights: flightCombo
        }));
    }).flat();

    // Kirim respon
    res.json({
        totalRoutes: processedPaths.length,
        routes: processedPaths.map((pathInfo, index) => ({
            id: index + 1,
            path: pathInfo.path.join(' → '),
            flights: pathInfo.flights.join(', ')
        }))
    });
});

// Rute untuk mendapatkan semua kota
app.get('/cities', (req, res) => {
    const cities = [...new Set(flights.flatMap(flight => [flight.from, flight.to]))];
    res.json({ cities });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
