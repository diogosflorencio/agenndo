#!/bin/bash
# Altera o autor dos commits do "cursoragent" para você (diogosflorencio).
# Rode no Git Bash: bash fix-commit-author.sh
# Depois: git push --force --all  e  git push --force --tags

git filter-branch -f --env-filter '
if [ "$GIT_AUTHOR_NAME" = "cursoragent" ] || [ "$GIT_AUTHOR_EMAIL" = "cursoragent@users.noreply.github.com" ]; then
  GIT_AUTHOR_NAME="diogosflorencio"
  GIT_AUTHOR_EMAIL="diogosflorencio@gmail.com"
fi
if [ "$GIT_COMMITTER_NAME" = "cursoragent" ] || [ "$GIT_COMMITTER_EMAIL" = "cursoragent@users.noreply.github.com" ]; then
  GIT_COMMITTER_NAME="diogosflorencio"
  GIT_COMMITTER_EMAIL="diogosflorencio@gmail.com"
fi
' -- --all
