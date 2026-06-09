## Intro
This is a fork of c9sdk, an web IDE. It is outdated with only run nodejs 12 and python 2. You probably need to use `docker` to run it.
Check `c9sdk-pm2-nginx/Dockerfile` for referrence

`c9sdk-pm2-nginx` is a separate git repo, which clone the [official c9sdk repo](ttps://github.com/c9/core.git) (Dockerfile line 38), we want to change it use ourr fork (this repo github.com/lequanghuylc/c9sdk.git)
To run it, check `run.sh`

## Current state

- C9 IDE will run at root path /, or /ide.html
- Reserve proxy (using 3rd library like `nginx`) to a sub path like /ide/ will fail

## Requirements

- Introduce new env variable `C9_SUB_PATH`, when that env variable is set, it will work in sub path. For example: `C9_SUB_PATH=ide`, it will work in `http://localhost:3399/ide/`
- Everything works normally, with or without `C9_SUB_PATH`

## Acceptance Criteria

- Make code update, create new PR, (check PAT access token in git remote)
- Update `c9sdk-pm2-nginx/Dockerfile` line 38 to clone from that specific branch
- get it up and running at `http://localhost:3399/ide/`