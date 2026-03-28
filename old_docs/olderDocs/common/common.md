kill -9 $(lsof -t -i:8081) $(lsof -t -i:5001) $(lsof -t -i:4000) $(lsof -t -i:9099) $(lsof -t -i:4400) $(lsof -t -i:4500) || true
