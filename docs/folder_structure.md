# Folder Structures

## Frontend (React)
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.js
│   │   │   └── Signup.js
│   │   ├── Chat/
│   │   │   ├── ChatWindow.js
│   │   │   └── MessageBubble.js
│   │   ├── Docs/
│   │   │   ├── FileUploader.js
│   │   │   └── DocumentList.js
│   │   ├── Summary.js
│   │   └── Quiz.js
│   ├── pages/
│   │   ├── Dashboard.js
│   │   ├── ChatPage.js
│   │   ├── SummaryPage.js
│   │   └── QuizPage.js
│   ├── services/
│   │   └── api.js
│   ├── context/
│   │   └── AuthContext.js
│   ├── App.js
│   └── index.js
├── package.json
└── README.md
```

## Backend (Node.js / Express)
```
backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── docController.js
│   │   └── chatController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── docRoutes.js
│   │   └── chatRoutes.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Document.js
│   │   └── Chunk.js
│   ├── services/
│   │   ├── textService.js
│   │   ├── embeddingService.js
│   │   ├── vectorService.js
│   │   └── llmService.js
│   ├── utils/
│   │   ├── chunker.js
│   │   ├── extractor.js
│   │   └── prompts.js
│   ├── config/
│   │   └── db.js
│   └── server.js
├── package.json
└── README.md
```
