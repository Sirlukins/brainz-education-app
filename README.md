# Brainz - Critical Thinking Education Platform

An innovative cognitive assessment platform that transforms psychological evaluation into engaging, narrative-driven game experiences. Brainz leverages adaptive AI and interactive game mechanics to measure and develop critical thinking abilities through immersive challenges.

## 🎯 Mission

Teaching critical thinking skills to high school students through gamified experiences that make learning engaging and effective.

## 🎮 Games

### Thought Zombies
Test your argumentative skills by defending your position on controversial topics against an AI opponent. Build strong, well-reasoned arguments to keep the "thought zombies" at bay!

**Features:**
- AI-powered dialogue using Google Gemini
- Real-time argument analysis and scoring
- Badge system for demonstrating specific argumentative skills
- Adaptive difficulty based on performance

### Health Nut
Learn to critically evaluate health claims through interactions with AI characters. Identify fallacies and strengthen your reasoning about health and wellness topics.

**Features:**
- Character-based dialogue (Qaylee and Plato)
- Socratic method teaching approach
- Focus on identifying logical fallacies in health claims

### Aura Eater
Practice considering contrary viewpoints and developing intellectual humility through perspective-taking exercises.

## 🚀 Technology Stack

- **Frontend:** React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend:** Node.js with Express.js
- **Database:** PostgreSQL with Drizzle ORM
- **AI Integration:** Google Gemini API for intelligent dialogue
- **Authentication:** Passport.js with session management
- **Deployment:** Replit hosting

## 📊 Features

- **User Authentication:** Secure login and registration system
- **Progress Tracking:** Comprehensive scoring and achievement system
- **Leaderboards:** Compare performance with other students
- **Badge System:** Unlock achievements for demonstrating critical thinking skills
- **Responsive Design:** Works on desktop, tablet, and mobile devices
- **Real-time Feedback:** Instant analysis of arguments and reasoning

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- Google Gemini API key

### Environment Variables
Create a `.env` file in the root directory with:

```env
DATABASE_URL=your_postgresql_connection_string
GEMINI_API_KEY=your_google_gemini_api_key
SESSION_SECRET=your_session_secret_key
```

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/yourusername/brainz-education-app.git
cd brainz-education-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5000`

## 🎨 Design Philosophy

Brainz combines educational psychology principles with modern game design to create an engaging learning environment that:

- Encourages active participation rather than passive consumption
- Provides immediate feedback on critical thinking performance
- Uses narrative elements to make abstract concepts concrete
- Adapts to individual learning styles and progress

## 🏗️ Architecture

```
Frontend (React/TypeScript) ↔ Backend (Express.js) ↔ Database (PostgreSQL)
                                      ↕
                              Google Gemini AI API
```

## 📈 Scoring System

- **Reasoning Points:** Awarded for logical arguments and evidence
- **Engagement Points:** Given for active participation and dialogue quality
- **Bonus Points:** Earned through badges and special achievements

## 🏆 Badge System

Students can earn badges for demonstrating specific skills:
- **Reason Giver:** Providing clear logical reasoning
- **Fact Checker:** Using evidence to support arguments
- **Link Cutter:** Identifying weak connections in arguments
- **Hidden Premise Hunter:** Uncovering unstated assumptions
- **Evidence Expert:** Effectively using data and research

## 🤝 Contributing

We welcome contributions to improve Brainz! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies for optimal performance
- AI integration powered by Google Gemini
- Educational framework based on critical thinking research
- Designed for high school educators and students

## 📞 Support

If you encounter any issues or have questions, please:
- Open an issue on GitHub
- Check the documentation
- Contact the development team

---

**Made with ❤️ for education and critical thinking**