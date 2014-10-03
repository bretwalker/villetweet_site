 /** @jsx React.DOM */
    
    var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
    
    var ScoredTwitterThing = React.createClass({displayName: 'ScoredTwitterThing',
        getInitialState: function() {
            return { 
                name: this.props.name, 
                score: this.props.score, 
                rank: this.props.rank,
                updatedScore: false 
            };
        },
        componentWillReceiveProps: function(nextProps) {
            this.setState({
                updatedScore: (nextProps.score > this.props.score) && (this.props.type == nextProps.type)
            });
        },
        componentDidUpdate: function() {
            if(this.state.updatedScore) {
                $(this.getDOMNode()).effect("highlight", {}, 500);
            }
        },
        render: function() {
            var link;
            if(this.props.type == 'hashtag') {
                link = 'https://twitter.com/search?q=%23' + this.props.name + '%20near%3A%22Louisville%2C%20KY%22%20within%3A15mi&src=typd'
            } else {
                link = 'https://twitter.com/' + this.props.name;
            }
            
            return (
                React.DOM.div({className: "thing"}, 
                    "#", this.props.rank, " - ", React.DOM.div({className: "thingName"}, React.DOM.a({href: link}, this.props.name)), " (", this.props.score, ")"
                )
            );
        }
    });

    var ScoredTwitterThingList = React.createClass({displayName: 'ScoredTwitterThingList',
        getInitialState: function() {
            return { users: this.props.users, source: null };
        },
        updateUserData: function(e) {
            update = JSON.parse(e.data)
	        for(var j = 0; j < this.props.users.length; j += 1) {
                if(this.props.users[j].name in update) {
                    this.props.users[j].score += update[this.props.users[j].name];
                }
            }
		    
		    this.setState({'users': this.props.users});
        },
        componentDidMount: function() {
            this.state.source = new EventSource('http://localhost:8080/subscribe/eps/' + this.props.type);
			this.state.source.onmessage = this.updateUserData;
        },
        componentWillUpdate: function(nextProps, nextState) {
            if(nextProps.type != this.props.type) {
                this.state.source.close();
                this.state.source = new EventSource('http://localhost:8080/subscribe/eps/' + nextProps.type);
                this.state.source.onmessage = this.updateUserData;
            }
        },
        render: function() {
            var rows = [];
            var rank = 0;
            var lastScore = 0;
            var _this = this;
            this.props.users.sort(sortScoreDescNameAsc).forEach(function(user) {
                if(lastScore != user.score) {
                    rank++;
                }
                rows.push(ScoredTwitterThing({name: user.name, score: user.score, rank: rank, key: user.name, type: _this.props.type}));
                lastScore = user.score;
            });
            return (
                React.DOM.div(null, 
                    rows
                )
            );
        }
    });

    var NavItem = React.createClass({displayName: 'NavItem',
        setNavSelection: function() {
            this.props.setNavSelection(this.props.item);
        },
        render: function() {
            return (
                React.DOM.ul(null, 
                    React.DOM.li({onClick: this.setNavSelection}, this.props.name)
                )
            );
        }
    });
        
    var Nav = React.createClass({displayName: 'Nav',
        setNavSelection: function(item) {
            this.props.setNavSelection(item);
        },
        render: function() {
            var _this = this;
            
            var navItems = [
                {
                    key: 'prolific',
                    name: 'Prolific Tweeters'
                },
                {
                    key: 'mentioned',
                    name: 'Most Mentioned'
                },
                {
                    key: 'hashtag',
                    name: 'Most Popular Hashtags'
                }
            ];

            var items = navItems.map(function(navItem) {
                return (
                    NavItem({item: navItem, 
                        key: navItem.key, 
                        name: navItem.name, 
                        setNavSelection: _this.setNavSelection, 
                        selected: navItem.key === _this.props.activeNavKey})
                );
            });

           return (
               React.DOM.div({className: "navigation"}, 
                   React.DOM.div({className: "header"}, "Navigation"), 
                   React.DOM.ul(null, 
                       items
                   )
               )
           );
        }
    });
    
    var App = React.createClass({displayName: 'App',
        getInitialState: function() {
            return { 
                activeNavKey: '',
                users: this.props.users,
                title: 'Prolific Tweeters',
                currentPage: 'prolific',
                url: '',
                days: 1
            };
        },
        render: function() {
            var _this = this;
            var content;
            if (this.state.currentPage == 'prolific') {
                content = ScoredTwitterThingList({users: this.state.users, type: "prolific"});
            } else if(this.state.currentPage == 'mentioned') {
                content = ScoredTwitterThingList({users: this.state.users, type: "mentioned"});
            } else if(this.state.currentPage == 'hashtag') {
                content = ScoredTwitterThingList({users: this.state.users, type: "hashtag"});
            }
            
            return (
                React.DOM.div(null, 
                    Nav({activeNavKey: this.state.activeNavKey, setNavSelection: this.setNavSelection}), 
                    React.DOM.h1(null, this.state.title), 
                    content
                )
            );
        },
        setNavSelection: function(item) {
            var _this = this;    
            $.ajax({
              type: "GET",
              url: 'http://localhost:8081/' + item.key + '?days=0',
            }).done(function(data) {
                _this.setState({
                    title: item.name,
                    currentPage: item.key,
                    users: data
                });
            });
        }
    });
    
    function sortScoreDescNameAsc(a, b) {
        nameA = a.name.toLowerCase();
        nameB = b.name.toLowerCase();
        
        if (a.score < b.score || (a.score == b.score && nameA > nameB)) {
            return 1;
        } else if (a.score > b.score || (a.score == b.score && nameA < nameB)) {
            return -1;
        } else {
            return 0;
        }
    }

    $(document).ready(function() {
        $.ajax({
          type: "GET",
          url: "http://localhost:8081/prolific?days=0",
        }).done(function(data) {
            React.renderComponent(App({users: data}), document.getElementById('list'));
        });
    });    

    