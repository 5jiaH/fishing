#!/bin/bash

npm i
pm2 start npm --name "nestjs" -- run start