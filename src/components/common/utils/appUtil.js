function generateGameId() {
  let id = '';
  const possible = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 6; i++) {
    id += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return id;
}

export {
  // eslint-disable-next-line import/prefer-default-export
  generateGameId,
};
