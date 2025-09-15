#!/bin/bash
# Script to deploy Flask backend to Heroku

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null
then
    echo "Heroku CLI not found. Please install it from https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Login to Heroku
heroku login

# Create Heroku app (if not exists)
APP_NAME="bluetooth-attendance-backend-$(date +%s)"
heroku create $APP_NAME

# Set buildpacks for Python
heroku buildpacks:set heroku/python -a $APP_NAME

# Push code to Heroku
git init
heroku git:remote -a $APP_NAME
git add .
git commit -m "Deploy backend to Heroku"
git push heroku master

# Open the app URL
heroku open -a $APP_NAME

echo "Backend deployed to https://$APP_NAME.herokuapp.com"
