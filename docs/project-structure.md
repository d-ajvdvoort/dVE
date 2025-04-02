# dVE Project Structure

This document outlines the structure of the dVeracity Verification Engine (dVE) project.

## Overview

The dVE project is organized into the following main directories:

- `backend`: Node.js/Express backend API
- `frontend`: React frontend application
- `blockchain`: Cardano Midnight with KERI integration
- `docs`: Project documentation

## Backend Structure

```
backend/
├── config/         # Configuration files
├── src/
│   ├── controllers/  # Request handlers
│   ├── models/       # Database models
│   ├── services/     # Business logic
│   ├── middleware/   # Express middleware
│   ├── utils/        # Utility functions
│   └── index.js      # Application entry point
├── tests/          # Test files
└── package.json    # Dependencies and scripts
```

## Frontend Structure

```
frontend/
├── public/         # Static files
├── src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Page components
│   ├── services/     # API service calls
│   ├── utils/        # Utility functions
│   ├── assets/       # Images, fonts, etc.
│   ├── App.js        # Main application component
│   └── index.js      # Application entry point
├── tests/          # Test files
└── package.json    # Dependencies and scripts
```

## Blockchain Structure

```
blockchain/
├── contracts/      # Smart contracts
│   ├── keri/         # KERI integration
│   └── midnight/     # Cardano Midnight contracts
├── integration/    # Integration with backend
├── tests/          # Test files
└── package.json    # Dependencies and scripts
```

## Documentation Structure

```
docs/
├── api/            # API documentation
└── user/           # User documentation
```

## Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: React
- **Blockchain**: Cardano Midnight with KERI integration
- **Database**: MongoDB (to be implemented)
- **Authentication**: JWT (to be implemented)
