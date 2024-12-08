import express, { json } from 'express';
import Graph from 'graphology';
const { MultiGraph } = Graph;
const app = express();

// Data penerbangan dengan informasi tambahan
const flights = [
    { from: "JKT", to: "SUB", flight: 1, airline: "Garuda", duration: 90, departure: "2024-12-08T06:00:00Z", arrival: "2024-12-08T07:01:00Z" },
    { from: "JKT", to: "JOG", flight: 2, airline: "Lion", duration: 85, departure: "2024-12-08T06:30:00Z", arrival: "2024-12-08T08:00:00Z" },
    { from: "SUB", to: "DPS", flight: 3, airline: "Citilink", duration: 70, departure: "2024-12-08T08:00:00Z", arrival: "2024-12-08T09:00:00Z" },
    { from: "JOG", to: "DPS", flight: 4, airline: "AirAsia", duration: 110, departure: "2024-12-08T11:00:00Z", arrival: "2024-12-08T12:30:00Z" },
    { from: "SUB", to: "JOG", flight: 5, airline: "Sriwijaya", duration: 120, departure: "2024-12-08T09:00:00Z", arrival: "2024-12-08T09:45:00Z" },
    { from: "JKT", to: "SUB", flight: 6, airline: "Batik", duration: 75, departure: "2024-12-08T07:00:00Z", arrival: "2024-12-08T08:00:00Z" },
    { from: "JKT", to: "DPS", flight: 7, airline: "Garuda", duration: 200, departure: "2024-12-08T06:45:00Z", arrival: "2023-10-02T09:45:00Z" },
    { from: "JOG", to: "JKT", flight: 8, airline: "Lion", duration: 80, departure: "2024-12-08T08:30:00Z", arrival: "2024-12-08T10:10:00Z" },
];

/**
 * Membuat graph multiedge dari data penerbangan.
 * @param {Array} flights - Data penerbangan dengan detail seperti durasi, waktu keberangkatan, dll.
 * @returns {MultiGraph} - Graph dengan node untuk kota dan edge untuk penerbangan.
 */
function createMultiGraph(flights) {
    const multiGraph = new MultiGraph();

    // Menambahkan semua node (kota) ke dalam graph
    const uniqueNodes = new Set(flights.flatMap(flight => [flight.from, flight.to]));
    uniqueNodes.forEach(node => multiGraph.addNode(node));

    // Menambahkan edge dengan informasi detail penerbangan
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

/**
 * Mencari semua jalur dari kota start ke kota end dalam graph.
 * @param {MultiGraph} graph - Graph yang merepresentasikan rute penerbangan.
 * @param {string} start - Kota awal.
 * @param {string} end - Kota tujuan.
 * @param {Array} path - Jalur saat ini (digunakan rekursi).
 * @param {Set} visited - Node yang sudah dikunjungi.
 * @returns {Array} - Daftar jalur yang memungkinkan.
 */
function findAllPaths(graph, start, end, path = [], visited = new Set()) {
    path = [...path, start]; // Tambahkan kota ke jalur saat ini
    visited.add(start); // Tandai kota sebagai sudah dikunjungi

    // Jika mencapai tujuan, kembalikan jalur
    if (start === end) {
        return [path];
    }

    let paths = [];

    // Iterasi semua tetangga dari kota saat ini
    graph.outNeighbors(start).forEach(neighbor => {
        if (!visited.has(neighbor)) {
            const newPaths = findAllPaths(graph, neighbor, end, path, new Set(visited));
            paths.push(...newPaths);
        }
    });

    return paths;
}

/**
 * Menemukan semua penerbangan yang valid antara dua kota.
 * @param {Array} flights - Data penerbangan.
 * @param {string} source - Kota asal.
 * @param {string} target - Kota tujuan.
 * @returns {Array} - Daftar penerbangan yang valid.
 */
function findValidFlights(flights, source, target) {
    return flights.filter(flight => flight.from === source && flight.to === target);
}

/**
 * Memeriksa apakah urutan penerbangan valid berdasarkan waktu (selisih minimal 1 jam antar penerbangan).
 * @param {Array} flights - Urutan penerbangan.
 * @returns {boolean} - True jika valid, false jika tidak.
 */
function isValidFlightSequence(flights) {
    for (let i = 1; i < flights.length; i++) {
        const prevArrival = new Date(flights[i - 1].arrival); // Waktu tiba penerbangan sebelumnya
        const currDeparture = new Date(flights[i].departure); // Waktu berangkat penerbangan saat ini
        if ((currDeparture - prevArrival) / (1000 * 60) < 60) { // Selisih kurang dari 1 jam
            return false;
        }
    }
    return true;
}

/**
 * Menghasilkan semua kombinasi penerbangan dari daftar jalur.
 * @param {Array} flightLists - Daftar penerbangan per segment.
 * @returns {Array} - Semua kombinasi penerbangan yang mungkin.
 */
function generateFlightCombinations(flightLists) {
    if (flightLists.length === 0) return [[]];

    const [firstList, ...remainingLists] = flightLists;
    const restCombinations = generateFlightCombinations(remainingLists);

    return firstList.flatMap(flight =>
        restCombinations.map(combo => [flight, ...combo])
    );
}

app.use(json());

// Endpoint untuk mendapatkan semua rute penerbangan
app.get('/flight-routes', (req, res) => {
    const { start, end, preferredAirline } = req.query;

    if (!start || !end) {
        return res.status(400).json({
            error: 'Parameter start dan end harus disertakan'
        });
    }

    // Buat graph dari data penerbangan
    const multiGraph = createMultiGraph(flights);

    // Temukan semua jalur dari start ke end
    const paths = findAllPaths(multiGraph, start, end);

    const processedPaths = paths.map((path) => {
        // Ambil daftar penerbangan untuk setiap segment jalur
        const flightDetails = path.slice(0, -1).map((node, i) => {
            let validFlights = findValidFlights(flights, node, path[i + 1]);
            // Filter berdasarkan maskapai jika dipilih
            if (preferredAirline) {
                validFlights = validFlights.filter(
                    flight => flight.airline.toLowerCase() === preferredAirline.toLowerCase()
                );
            }
            return validFlights;
        });

        // Hasilkan semua kombinasi penerbangan
        const allFlightCombinations = generateFlightCombinations(flightDetails);

        // Validasi setiap kombinasi penerbangan berdasarkan waktu
        return allFlightCombinations
            .filter(isValidFlightSequence)
            .map(flightCombo => ({
                path,
                flights: flightCombo
            }));
    }).flat();

    // Hitung total durasi untuk setiap rute
    const routesWithDuration = processedPaths.map((pathInfo, index) => {
        const totalDuration = pathInfo.flights.reduce((sum, flight) => sum + flight.duration, 0);
        return {
            id: index + 1,
            path: pathInfo.path.join(' → '),
            flights: pathInfo.flights.map(f => `${f.flight} (${f.airline})`).join(', '),
            totalDuration: `${totalDuration} menit`,
            schedule: pathInfo.flights.map(f => `${f.departure} - ${f.arrival}`)
        };
    });

    res.json({
        totalRoutes: routesWithDuration.length,
        routes: routesWithDuration
    });
});

// Endpoint untuk mendapatkan daftar maskapai
app.get('/airlines', (req, res) => {
    const airlines = [...new Set(flights.map(flight => flight.airline))];
    res.json({ airlines });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
