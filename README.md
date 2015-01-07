TrueExponential
===============

The game
-----------
The first clicker/idle/incremental game featuring exponential progress!

Click the button to generate cash, buy upgrades to boost your multiplier and let exponential growth do the rest.

Check the changelog for a full list of changes and updates.

Motivation
-----------
There seems to be a common misconception between incremental game players about what exponential growth is. Many players, and even some developers, have labeled "exponential growth" what really is polynomial growth (even if it is a higher degree than 2).

I made a little demo showcasing how fast exponential growth is, and after popular demand, I decided to develop it as a fully fledged game.

Technology
-----------
The game is developed in Javascript (Angular.js) and uses [decimal.js](https://github.com/MikeMcl/decimal.js/) to break free of the 1e308 limit of regular JS numbers. Still, the maximum number provided by decimal.js dwarfs in the scale of exponential growth, and libraries that provided even bigger numbers are always welcome.
