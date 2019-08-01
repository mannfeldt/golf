import React, { Component } from 'react';
import './App.scss';
import Header from './components/common/Header';
import Play from './components/pages/Play';
import CustomizedSnackbars from './components/common/CustomizedSnackbars';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      snack: '',
      showHeader: true,
    };
    const hash = window.location.hash
      .substring(1)
      .split('&')
      .reduce((initial, item) => {
        if (item) {
          const parts = item.split('=');
          initial[parts[0]] = decodeURIComponent(parts[1]);
        }
        return initial;
      }, {});
    window.location.hash = '';
    if (hash.access_token) {
      localStorage.setItem('spotifytoken', hash.access_token);
      localStorage.setItem('spotifytoken_timestamp', Date.now());
    }
    this.showSnackbar = this.showSnackbar.bind(this);
    this.hideSnackbar = this.hideSnackbar.bind(this);
    this.toggleHeader = this.toggleHeader.bind(this);
  }

  hideSnackbar() {
    const snack = this.state.snack;
    snack.open = false;
    this.setState({
      snack,
    });
  }

  showSnackbar(snack) {
    snack.open = true;
    this.setState({
      snack,
    });
  }

  toggleHeader(value) {
    this.setState({ showHeader: value });
  }

  render() {
    return (
      <div className="App">
        {this.state.showHeader && <Header />}
        <div id="content">

          <Play
            showSnackbar={this.showSnackbar}
            toggleHeader={this.toggleHeader}
          />
        </div>
        {this.state.snack && (
        <CustomizedSnackbars
          snack={this.state.snack}
          hideSnackbar={this.hideSnackbar}
        />
        )}
      </div>
    );
  }
}

export default App;
