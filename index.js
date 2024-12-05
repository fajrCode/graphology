import express from 'express';
import Graph from 'graphology';
import { allSimplePaths } from 'graphology-simple-path';

const app = express();
const graph = new Graph();

// Tambahkan data penerbangan ke graf
graph.addNode('A');
graph.addNode('B');
graph.addNode('C');
graph.addEdge('A', 'B', { departureTime: '08:00', arrivalTime: '10:00' });
graph.addEdge('B', 'C', { departureTime: '12:00', arrivalTime: '14:00' });

// Endpoint untuk mencari rute
app.get('/routes', (req, res) => {
    try {
        const { departureAirportId, arrivalAirportId } = req.query;

        const paths = allSimplePaths(graph, departureAirportId, arrivalAirportId);
        const routes = paths.map(path => {
            return path.map(node => ({
                node,
                edge: graph.getEdgeAttributes(graph.edge(path[0], path[1])),
            }));
        });

        res.json(routes);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(9000, () => {
    console.log('Server is running on port 3000');
});
