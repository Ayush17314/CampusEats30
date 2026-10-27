import dotenv from 'dotenv';
dotenv.config();

import { createServer } from './server.js';
import { seedInitialData } from './seed.js';

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    const app = await createServer();
    
    // Seed initial demo data (vendors, dishes, riders, users)
    await seedInitialData();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` CampusEats Microservices Backend running on port ${PORT}`);
      console.log(` - REST API Base:      http://localhost:${PORT}/api/v1`);
      console.log(` - GraphQL Endpoint:   http://localhost:${PORT}/graphql`);
      console.log(` - GraphQL Demo Page:  http://localhost:${PORT}/`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start CampusEats server:', err);
    process.exit(1);
  }
}

bootstrap();
