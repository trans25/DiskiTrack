import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
} from '@mui/material';
import { api } from '../api/client.js';

export default function Analytics() {
  const [tab, setTab] = useState(0);
  const [scorers, setScorers] = useState([]);

  useEffect(() => {
    api.get('/analytics/top-scorers?limit=15').then((res) => setScorers(res.data));
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Analytics
      </Typography>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Top Scorers" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Player</TableCell>
                  <TableCell align="right">Goals</TableCell>
                  <TableCell align="right">Assists</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scorers.map((p, i) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      {p.first_name} {p.last_name}
                    </TableCell>
                    <TableCell align="right">{p.goals}</TableCell>
                    <TableCell align="right">{p.assists}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
