 /** @jsx React.DOM */
    
    var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
    
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
        },
        {
            key: 'recent',
            name: 'The Firehose'
        }
    ];
    
    var subNavItems = [
        {
            key: 0,
            name: 'All time'
        },
        {
            key: 1,
            name: 'Last Month'
        },
        {
            key: 2,
            name: 'Last Week'
        },
    ];
    
    var thingPositions = {};
    var twitterNameRegex = /(^|[^@\w])@(\w{1,15})\b/g;
    var twitterNameRegexReplace = '$1<a href="https://twitter.com/$2">@$2</a>';
    var twitterHashtagRegex = /(^|[^@\w])#(\w{1,15})\b/g;
    var twitterHashtagRegexReplace = '$1<a href="https://twitter.com/search?q=%23$2%20near%3A%22Louisville%2C%20KY%22%20within%3A15mi&src=typd">@$2</a>';
    
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
                    "#", this.props.rank, " - ", React.DOM.span({className: "thingName"}, React.DOM.a({href: link}, this.props.name)), " (", this.props.score, ")"
                )
            );
        }
    });

    var ScoredTwitterThingList = React.createClass({displayName: 'ScoredTwitterThingList',
        getInitialState: function() {
            return { users: this.props.users, source: null };
        },
        updateUserData: function(e) {
            var _this = this;
            update = JSON.parse(e.data)

		    $.each(update, function(key, value) {
		        if (key in thingPositions) {
		            var position = thingPositions[key];
		            _this.props.users[position].score += value;
		        } 
		    });
		    
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
        componentWillUnmount: function() {
            this.state.source.close();
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
    
    var Tweet = React.createClass({displayName: 'Tweet',
        render: function() {
            
            var text = twttr.txt.autoLink(minEmoji(this.props.text));
            var username = twttr.txt.autoLink('@' + this.props.screenName);
            
            return (
                React.DOM.div({className: "tweet"}, 
                React.DOM.span({className: "tweetText", dangerouslySetInnerHTML: {__html: text}}), 
                React.DOM.span({className: "tweetScreenName", dangerouslySetInnerHTML: {__html: username}})
                )
            );
        }
    });
    
    var TweetListControl = React.createClass({displayName: 'TweetListControl',
        getInitialState: function() {
            return { handleClick: this.props.handleClick };
        },
        handleClick: function() {
            this.props.handleClick();
        },
        render: function() {
            var text = this.props.isRunning ? "Stop" : "Resume";
            
            return (
                React.DOM.span({onClick: this.handleClick, className: "firehoseControl"}, text)
            );
        }
    });
    
    var TweetList = React.createClass({displayName: 'TweetList',
        getInitialState: function() {
            return { tweets: this.props.tweets, source: null, isRunning: true };
        },
        handleControlClick: function() {
            this.setState({'isRunning': !this.props.isRunning});
        },
        updateTweets: function(e) {
            if(!this.props.isRunning) {
                console.log(this.props.isRunning);
                                console.log(this.state.isRunning);
                console.log('stopped');
                return;
            }
            
            var _this = this;
            update = JSON.parse(e.data)

		    this.props.tweets.pop();
		    this.props.tweets.unshift(update);
		    
		    this.setState({'tweets': this.props.tweets});
        },
        componentDidMount: function() {
            this.state.source = new EventSource('http://localhost:8080/subscribe/recent-tweets');
		    this.state.source.onmessage = this.updateTweets;
        },
        componentWillUnmount: function() {
            this.state.source.close();
        },
        render: function() {
            var items = this.props.tweets.map(function(tweet) {
                return (
                    Tweet({possiblySensitive: tweet.possibly_sensitive, 
                        text: tweet.text, 
                        screenName: tweet.screen_name, 
                        profileImageUrl: tweet.profile_image_url, 
                        createdAt: tweet.created_at, 
                        id: tweet.id, 
                        key: tweet.id})
                );
            });
            
            return (
                React.DOM.div(null, 
                    TweetListControl({
                        isRunning: this.state.isRunning, 
                        handleClick: this.handleControlClick}), 
                    items
                )
            );
        }
    });

    var NavItem = React.createClass({displayName: 'NavItem',
        setNavSelection: function() {
            this.props.setNavSelection(this.props.item);
        },
        render: function() {
            var cx = React.addons.classSet;
            var classes = cx({
               'selected': this.props.selected,
               'first': this.props.name == navItems[0].name
            });
            return (
                React.DOM.li({onClick: this.setNavSelection, className: classes}, this.props.name)
            );
        }
    });
        
    var Nav = React.createClass({displayName: 'Nav',
        setNavSelection: function(item) {
            this.props.setNavSelection(item);
        },
        render: function() {
            var _this = this;
            
            var items = this.props.navItems.map(function(navItem) {
                return (
                    NavItem({item: navItem, 
                        key: navItem.key, 
                        name: navItem.name, 
                        setNavSelection: _this.setNavSelection, 
                        selected: navItem.key === _this.props.currentPage})
                );
            });

           return (
                React.DOM.ul(null, 
                    items
                )
           );
        }
    });
    
    var App = React.createClass({displayName: 'App',
        getInitialState: function() {
            return { 
                users: this.props.users,
                title: 'Prolific Tweeters',
                currentPage: 'prolific',
                days: 0,
                url: '',
                tweets: []
            };
        },
        render: function() {
            var content;
            
            if (this.state.currentPage == 'prolific') {
                content = ScoredTwitterThingList({users: this.state.users, type: "prolific"});
            } else if(this.state.currentPage == 'mentioned') {
                content = ScoredTwitterThingList({users: this.state.users, type: "mentioned"});
            } else if(this.state.currentPage == 'hashtag') {
                content = ScoredTwitterThingList({users: this.state.users, type: "hashtag"});
            } else if(this.state.currentPage == 'recent') {
                content = TweetList({tweets: this.state.tweets});
            }
            
            var navs = [
                Nav({currentPage: this.state.currentPage, setNavSelection: this.setNavSelection, navItems: navItems, key: "mainNav"})
            ];
            
            if(['prolific', 'mentioned', 'hashtag'].indexOf(this.state.currentPage) > -1) {
                navs.push(Nav({currentPage: this.state.days, setNavSelection: this.setSubNavSelection, navItems: subNavItems, key: "subNavItems"}));
            }
            
            return (
                React.DOM.div(null, 
                    React.DOM.div({className: "navigation"}, 
                        navs
                    ), 
                    React.DOM.h1(null, this.state.title), 
                    React.DOM.div(null, 
                        content
                    )
                )
            );
        },
        changeNav: function(page, days) {
            var _this = this;    
            $.ajax({
              type: "GET",
              url: 'http://localhost:8081/' + page + '?days=' + days,
            }).done(function(data) {
                thingPositions = {};
                
                if(_this.state.currentPage == 'recent') {
                    _this.setState({
                        tweets: data
                    });
                } else {    
                    var i = 0;
                    $.each(data, function() {
                        thingPositions[this.name] = i++;
                    });
                    _this.setState({
                        users: data
                    });
                }
            });  
        },
        setNavSelection: function(item) {
            var _this = this;    
            this.setState({
                title: item.name,
                currentPage: item.key
            }, this.changeNav(item.key, _this.state.days));
        },
        setSubNavSelection: function(item) {
            var _this = this;    
            this.setState({
                days: item.key,
            }, this.changeNav(_this.state.currentPage, item.key));
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
            thingPositions = {};
            var i = 0;
            $.each(data, function() {
                thingPositions[this.name] = i++;
            });
            React.renderComponent(App({users: data}), document.getElementById('list'));
        });
    });    

    