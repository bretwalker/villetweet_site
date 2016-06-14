 /** @jsx React.DOM */

    var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

    var baseServiceUrl = 'http://louiewatch.com'

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
            name: 'Popular Hashtags'
        },
        {
            key: 'recent',
            name: 'Firehose'
        }
    ];

    var subNavItems = [
        {
            key: 'all', // 0
            param: 0,
            name: 'Since Launch (June 14, 2016)'
        },
        {
            key: '7d', // 1
            param: 1,
            name: 'Last 7 Days'
        },
        {
            key: '30d', // 2
            param: 2,
            name: 'Last 30 Days'
        },
    ];

    var thingPositions = {};
    var isChangingNav = false;

    var ScoredTwitterThing = React.createClass({
        getInitialState: function() {
            return {
                updatedScore: false
            };
        },
        componentWillReceiveProps: function(nextProps) {
            this.setState({
                updatedScore: (nextProps.score > this.props.score)
            });
        },
        componentDidUpdate: function() {
            if(this.state.updatedScore && !isChangingNav) {
                $(this.getDOMNode()).effect("highlight", {}, 500);
            }
        },
        render: function() {
            var link;
            if(this.props.type == 'hashtag') {
                link = 'https://twitter.com/search?f=realtime&q=%23' + this.props.name + '%20near%3A%22Louisville%2C%20KY%22%20within%3A15mi&src=typd'
            } else {
                link = 'https://twitter.com/' + this.props.name;
            }

            return (
                <div className="thing">
                    #{this.props.rank} - <span className="thingName"><a href={link}>{this.props.name}</a></span> ({this.props.score})
                </div>
            );
        }
    });

    var ScoredTwitterThingList = React.createClass({
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
            this.state.source = new EventSource(baseServiceUrl + ':8080/subscribe/eps/' + this.props.type);
			this.state.source.onmessage = this.updateUserData;
        },
        componentWillUpdate: function(nextProps, nextState) {
            if(nextProps.type != this.props.type) {
                this.state.source.close();
                this.state.source = new EventSource(baseServiceUrl + ':8080/subscribe/eps/' + nextProps.type);
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
                rows.push(<ScoredTwitterThing name={user.name} score={user.score} rank={rank} key={user.name} type={_this.props.type} days={_this.props.days} />);
                lastScore = user.score;
            });
            return (
                <div>
                    {rows}
                </div>
            );
        }
    });

    var Tweet = React.createClass({
        render: function() {

            var text = twttr.txt.autoLink(minEmoji(this.props.text));
            var bioUrl = "https://twitter.com/" + this.props.screenName;
            return (
                <li className="list-group-item tweet">
                    <span className="tweetText" dangerouslySetInnerHTML={{__html: text}} />
                    <div className="tweetUserInfo">
                        <a href={bioUrl}>
                            <span className="twitterName">{this.props.name}</span>
                            <span className="twitterScreenName">@{this.props.screenName}</span>
                        </a>
                    </div>
                </li>
            );
        }
    });

    var TweetListControl = React.createClass({
        getInitialState: function() {
            return { handleClick: this.props.handleClick };
        },
        handleClick: function() {
            this.props.handleClick();
        },
        render: function() {

            var cx = React.addons.classSet;
            var classes = cx({
                'glyphicon': true,
                'glyphicon-play': !this.props.isRunning,
                'glyphicon-pause': this.props.isRunning
            });

            return (
                <button type="button" className="btn btn-default btn-lg firehoseControl" onClick={this.handleClick}>
                    <span className={classes}></span>
                </button>
            );
        }
    });

    var TweetList = React.createClass({
        getInitialState: function() {
            return { tweets: this.props.tweets, source: null, isRunning: this.props.isRunning };
        },
        handleControlClick: function() {
            this.setState({'isRunning': !this.state.isRunning});
        },
        updateTweets: function(e) {
            if(!this.state.isRunning) {
                return;
            }

            var _this = this;
            update = JSON.parse(e.data)

		    this.props.tweets.pop();
		    this.props.tweets.unshift(update);

		    this.setState({'tweets': this.props.tweets});
        },
        componentDidMount: function() {
            this.state.source = new EventSource(baseServiceUrl + ':8080/subscribe/recent-tweets');
		    this.state.source.onmessage = this.updateTweets;
        },
        componentWillUnmount: function() {
            this.state.source.close();
        },
        render: function() {
            var items = this.props.tweets.map(function(tweet) {
                return (
                    <Tweet possiblySensitive={tweet.possibly_sensitive}
                        text={tweet.text}
                        screenName={tweet.screen_name}
                        name={tweet.name}
                        profileImageUrl={tweet.profile_image_url}
                        createdAt={tweet.created_at}
                        id={tweet.id}
                        key={tweet.id} />
                );
            });

            return (
                <div>
                <div id="tweet-control">
                    <TweetListControl
                        isRunning={this.state.isRunning}
                        handleClick={this.handleControlClick} />
                </div>
                <div>
                    <ul className="list-group">
                        {items}
                    </ul>
                </div>
                </div>
            );
        }
    });

    var NavItem = React.createClass({
        setNavSelection: function() {
            this.props.setNavSelection(this.props.item);
        },
        render: function() {
            var cx = React.addons.classSet;
            var classes = cx({
               'active': this.props.selected
            });
            return (
                <li onClick={this.setNavSelection} className={classes}><a href="" className="nav-item">{this.props.name}</a></li>
            );
        }
    });

    var Nav = React.createClass({
        setNavSelection: function(item) {
            this.props.setNavSelection(item);
        },
        setSubNavSelection: function(item) {
            this.props.setSubNavSelection(item);
        },
        render: function() {
            var _this = this;

            var items = this.props.navItems.map(function(navItem) {
                return (
                    <NavItem item={navItem}
                        key={navItem.key}
                        name={navItem.name}
                        setNavSelection={_this.setNavSelection}
                        selected={navItem.key === _this.props.currentPage} />
                );
            });

            var text = this.props.key == "mainNav" ? "Ratings Lists & Firehose" : "Date Ranges";

            return (
                <li className="dropdown">
                    <a href="" className="dropdown-toggle" data-toggle="dropdown">{text}<span className="caret"></span></a>
                    <ul className="dropdown-menu" role="menu">
                        {items}
                    </ul>
                </li>
            );
        }
    });

    var TweetCount = React.createClass({
        updateTweetCount: function(e) {
            var _this = this;
            update = JSON.parse(e.data)

		    $.each(update, function(key, value) {
		        _this.setState({
                    tweetCount: _this.state.tweetCount += value
                });
		    });
        },
        getInitialState: function() {
            var source = new EventSource(baseServiceUrl + ':8080/subscribe/eps/tweet-count');
            source.onmessage = this.updateTweetCount;
            return { tweetCount: 0, source: source };
        },
        componentDidMount: function() {
            var _this = this;
            $.ajax({
              type: 'GET',
              url: baseServiceUrl + ':8081/tweet-count',
            }).done(function(data) {
                _this.setState({
                    tweetCount: data.tweet_count
                });
            });
        },
        render: function() {
            return (
                <div id="tweet-count">
                    {this.state.tweetCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} tweets and counting...
                </div>
            );
        }
    });

    var App = React.createClass({
        getInitialState: function() {
            return {
                users: this.props.users,
                title: this.props.title,
                subtitle: this.props.subtitle,
                currentPage: this.props.currentPage,
                days: this.props.days,
                url: '',
                tweets: this.props.tweets,
            };
        },
        render: function() {
            var content;

            if (this.state.currentPage == 'prolific') {
                content = <ScoredTwitterThingList users={this.state.users} type='prolific' days={this.state.days}  />;
            } else if(this.state.currentPage == 'mentioned') {
                content = <ScoredTwitterThingList users={this.state.users} type='mentioned' days={this.state.days} />;
            } else if(this.state.currentPage == 'hashtag') {
                content = <ScoredTwitterThingList users={this.state.users} type='hashtag' days={this.state.days} />;
            } else if(this.state.currentPage == 'recent') {
                content = <TweetList tweets={this.state.tweets} isRunning={true} />;
            }

            var navs = [<Nav currentPage={this.state.currentPage}
                setNavSelection={this.setNavSelection}
                navItems={navItems}
                key="mainNav" />];

            if(['prolific', 'mentioned', 'hashtag'].indexOf(this.state.currentPage) > -1) {
                navs.push(<Nav currentPage={this.state.days}
                    setNavSelection={this.setSubNavSelection}
                    navItems={subNavItems}
                    key="subNav" />);
            }

            var subtitle = '';
            if(this.state.title != 'Firehose') {
                subtitle =  this.state.subtitle;
            }

            return (
                <div>
                    <nav className="navbar navbar-default navbar-fixed-top" role="navigation">
                        <div className="container">
                            <div className="navbar-header">
                                <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target=".navbar-collapse">
                                    <span className="sr-only">Toggle navigation</span>
                                    <span className="icon-bar"></span>
                                    <span className="icon-bar"></span>
                                    <span className="icon-bar"></span>
                                </button>
                                <a className="navbar-brand" href="/#prolific/all">502 Tweets</a>
                            </div>
                            <div className="navbar-collapse collapse">
                                <ul className="nav navbar-nav" role="menu">
                                    {navs}
                                    <li><a href="http://www.louiewatch.com">Louie Watch <span className="glyphicon glyphicon-share-alt"></span></a></li>
                                </ul>
                            </div>
                        </div>
                    </nav>
                    <div id="content">
                    <h1>{this.state.title}</h1>
                    <h4>{subtitle}</h4>
                    <TweetCount />
                    <div>
                        {content}
                    </div>
                    </div>
                </div>
            );
        },
        changeNav: function(page, days) {
            $('.navbar-collapse').removeClass('in');
            $('li.dropdown').removeClass('open');

            var _this = this;
            $.ajax({
              type: "GET",
              url: baseServiceUrl + ':8081/' + page + '?days=' + $.grep(subNavItems, function(e){ return e.key == days; })[0].param,
            }).done(function(data) {
                thingPositions = {};

                if(_this.state.currentPage == 'recent') {
                    _this.setState({
                        tweets: data
                    });
                } else {
                    var i = 0;

                    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                        data.length = 100;
                    }

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
            if(item.key == this.state.currentPage) {
                return;
            }

            isChangingNav = true;
            var _this = this;
            this.setState({
                title: item.name,
                currentPage: item.key
            }, this.changeNav(item.key, _this.state.days));
            history.pushState(null,
                null,
                '#' + item.key + (item.key != 'recent' ? '/' + _this.state.days : ''));
            window.setTimeout(function() {
                isChangingNav = false;
            }, 3000);
        },
        setSubNavSelection: function(item) {
            if(item.key == this.state.days) {
                return;
            }

            isChangingNav = true;
            var _this = this;
            this.setState({
                subtitle: item.name,
                days: item.key,
            }, this.changeNav(_this.state.currentPage, item.key));
            history.pushState(null,
                null,
                '#' + _this.state.currentPage + (_this.state.currentPage != 'recent' ? '/' + item.key : ''));
            window.setTimeout(function() {
                isChangingNav = false;
            }, 3000);
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
        var location = window.history.location || window.location;
        var app;

        $(document).on('click', 'a.nav-item', function() {
            return false;
        });

        $(window).on('popstate', function(e) {
            var mainNavItem = $.grep(navItems, function(e){ return location.href.search(e.key)!=-1; });
            var subNavItem = $.grep(subNavItems, function(e){ return location.href.search(e.key)!=-1; });
            if(mainNavItem.length == 0) {
                app.setNavSelection(navItems[0]);
                app.setSubNavSelection(subNavItem[0]);
            } else {
                app.setNavSelection(mainNavItem[0]);
                app.setSubNavSelection(subNavItem[0]);
            }
        });

        var urlEnd = 'prolific?days=0';
        var currentPage = navItems[0].key;
        var days = subNavItems[0].key;
        var title = navItems[0].name;
        var subtitle = subNavItems[0].name;

        var mainNavItem = $.grep(navItems, function(e){ return location.href.search(e.key)!=-1; });
        if(mainNavItem.length > 0) {
            currentPage = mainNavItem[0].key;
            title = mainNavItem[0].name;
            urlEnd = mainNavItem[0].key;
            var subNavItem = $.grep(subNavItems, function(e){ return location.href.search(e.key)!=-1; });
            if(subNavItem.length > 0) {
                urlEnd = urlEnd + '?days=' + subNavItem[0].param;
                days = subNavItem[0].key;
                subtitle = subNavItem[0].name;
            }
        }

        $.ajax({
          type: 'GET',
          url: baseServiceUrl + ':8081/' + urlEnd,
        }).done(function(data) {
            if(currentPage == 'recent') {
                app = React.renderComponent(App({tweets: data, users: [], currentPage: currentPage, days: days, title: title, subtitle: subtitle }), document.getElementById('list'));
            }
            else {
                if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                    data.length = 100;
                }

                thingPositions = {};
                var i = 0;
                $.each(data, function() {
                    thingPositions[this.name] = i++;
                });

                app = React.renderComponent(App({users: data, tweets: [], currentPage: currentPage, days: days, title: title, subtitle: subtitle }), document.getElementById('list'));
            }
        });
    });


