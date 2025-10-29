# Relative Weather App

A simple web application that shows current weather compared to yesterday's weather at the same time, helping you understand relative temperature changes.

## 🌟 Features

- **Weather Comparison**: See current weather vs yesterday's weather side by side
- **Temperature Difference**: Color-coded temperature differences (red for warmer, blue for colder)
- **Location Search**: Search by city name or use current location
- **Recent Searches**: Quick access to recently searched cities
- **Mobile Responsive**: Works perfectly on all devices
- **Offline Support**: Basic offline detection
- **Clean UI**: Modern, minimal design focused on the essential information

## 🚀 Quick Start

### 1. Get an API Key
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key (free tier allows 1,000 calls/day)

### 2. Setup
1. Clone or download this project
2. Open `script.js`
3. Replace `YOUR_API_KEY_HERE` with your actual API key:
   ```javascript
   const API_KEY = 'your_actual_api_key_here';
   ```

### 3. Run
1. Open `index.html` in any modern web browser
2. Enter a city name or use the location button
3. See how today's weather compares to yesterday!

## 📖 How It Works

### Data Sources
- **Current Weather**: Fetched from OpenWeatherMap API
- **Yesterday's Weather**: 
  - Uses stored data from previous searches (via localStorage)
  - Falls back to mock data for demonstration (since historical data requires paid API)

### Data Storage
The app stores today's weather data locally, so when you search for the same city tomorrow, it can show you the actual comparison. This works around the limitation of the free API tier not including historical data.

## 🎯 Usage

1. **Search by City**: Type any city name and press Enter or click "Get Weather"
2. **Use Location**: Click the 📍 button to get weather for your current location
3. **Recent Searches**: Click on any recently searched city to search again
4. **View Comparison**: See the temperature difference prominently displayed between today and yesterday

## 🛠️ Technical Details

### Technologies Used
- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **API**: OpenWeatherMap API
- **Storage**: localStorage for data persistence
- **Responsive**: CSS Grid and Flexbox

### Browser Support
- Chrome/Edge (80+)
- Firefox (75+)
- Safari (13+)
- Mobile browsers

### File Structure
```
relative-weather/
├── index.html          # Main HTML file
├── style.css           # Styling and responsive design
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## 🎨 Customization

### Changing Colors
Edit the CSS variables in `style.css`:
```css
/* Temperature difference colors */
.warmer { color: #e74c3c; }    /* Red for warmer */
.colder { color: #3498db; }    /* Blue for colder */
.same { color: #27ae60; }      /* Green for same */
```

### Adding Features
The code is structured to be easily extensible:
- Add new weather data points in `displayWeatherComparison()`
- Modify the UI in the HTML and corresponding CSS
- Extend localStorage functionality for more data persistence

## 🔧 Troubleshooting

### Common Issues

**"Please add your OpenWeatherMap API key"**
- Make sure you've replaced `YOUR_API_KEY_HERE` in `script.js` with your actual API key

**"Invalid API key"**
- Check that your API key is correct
- Make sure your API key is activated (can take a few minutes after signup)

**"City not found"**
- Try different spelling or add country code (e.g., "London, UK")
- Some smaller cities might not be in the database

**Location not working**
- Make sure you've granted location permission to your browser
- Location services must be enabled on your device

### API Limitations
- Free tier: 1,000 calls/day
- Historical data requires paid subscription
- Some remote locations might not be available

## 🚀 Deployment

### GitHub Pages (Recommended)
1. Push your code to a GitHub repository
2. Go to Settings → Pages
3. Select source branch (usually `main`)
4. Your app will be available at `https://yourusername.github.io/your-repo-name`

### Netlify
1. Drag and drop your project folder to [Netlify](https://netlify.com)
2. Your app will be deployed instantly with a custom URL

### Vercel
1. Import your GitHub repository to [Vercel](https://vercel.com)
2. Deploy automatically with each commit

## 🔮 Future Enhancements

- Historical weather data (with paid API)
- Hourly comparisons
- Weather forecast trends
- Multiple city comparisons
- Weather alerts and notifications
- Clothing recommendations based on temperature change
- Dark mode
- Progressive Web App (PWA) features

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Feel free to contribute! This is a simple project perfect for:
- Beginners learning web development
- Adding new features
- Improving the UI/UX
- Fixing bugs

## 📞 Support

If you have questions or run into issues:
1. Check the troubleshooting section above
2. Make sure your API key is set up correctly
3. Check the browser console for error messages
4. Verify your internet connection

---

**Made with ❤️ for weather enthusiasts who want to know: "Is it actually colder today, or does it just feel that way?"** 