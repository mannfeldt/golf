import React, { Component } from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';

class Header extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const titleText = 'Golf';

    return (
      <div id="header">
        <AppBar position="static">
          <Toolbar className="toolbar">
            <div className="appbar-container--left">
              {titleText}
            </div>
          </Toolbar>
        </AppBar>
      </div>
    );
  }
}
export default Header;
