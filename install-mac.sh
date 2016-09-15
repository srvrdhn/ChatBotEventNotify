#!/bin/bash

brew install postgres
brew tap homebrew/services
brew services start postgresql
createdb ChatBotEventNotify

psql -d ChatBotEventNotify < ./postgres/setup.sql

psql -d ChatBotEventNotify
