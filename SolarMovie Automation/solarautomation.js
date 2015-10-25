$(function() {  

	var _currentMovieIndex = 0;
	var _baseUrl = "https://www.solarmovie.is";
	
	InvokeAutomationStep();

	///
	/// Invoke the appropriate automation step
	///
	function InvokeAutomationStep() {
		var _uri = new URI(location.href);
		var _segs = _uri.segment();
		
		if(_segs.length > 0) {
		
			switch(_segs[0].toLowerCase()){
				case "tv":
					Step_ClickFirstLink();
				break;
				case "link":
					if(_segs.length > 1 && _segs[1].toLowerCase() == "show")
						Step_ClickPlayNow();
					else if(_segs.length > 1 && _segs[1].toLowerCase() == "play")
						Step_ReadScript();
				break;
				case "advanced-search":
					Step_SubscribePageTab();
				break;
				default:
					if(_segs[0].toLowerCase().indexOf(".html") > -1)
						// Movie has no sub folder
						Step_ClickFirstLink();
				break;
			}
		}
	}

	function Step_ClickFirstLink() {
		var _allowedPlayers = [ "vidbull.com", "vodlocker.com", "vidzi.tv", "allmyvideos.net" ];
		var _surl = null;
		
		$("#content table.dataTable").find("tr").each(function() {
			var g = $(this);
			$.each(_allowedPlayers, function(i, v) {
				if(g.text().toLowerCase().indexOf(v) > -1) {
					_surl = g.find("td:eq(0) > a");
					return false;
				}
			});
		});
		
		if(_surl != null) {
			Send_BackgroundPage_Message("switchUrl", { url: _baseUrl + _surl.attr("href") });
		} else {
			Send_BackgroundPage_Message("watchedSuccessfully", null);
		}
	}
	
	function Step_ClickPlayNow() {
	
		var _purl = $("#content div.watchMovieBlock > div.linksWrapper a.fullyGreenButton").first().attr("href");
		
		Send_BackgroundPage_Message("switchUrl", { url: _purl });
	}
	
	function Step_ReadScript() {
		$("script").each(function() {
			var i = $(this).text().indexOf("confirmNotify.get().on('pnotify.confirm',");
			if(i > -1) {
				i = $(this).text().indexOf("jQuery.ajax(SOLAR.ajax.getSettings", i);
				var x = $(this).text().indexOf("hash", i);
				x = $(this).text().indexOf("}", x);
				
				var s = $(this).text().substring(i,x) + "}}));";
				
				Step_InjectMaliciousScript(s);
				
				return false;
			}
		});
	}
	
	function Step_InjectMaliciousScript(script) {
		var scriptNode          = document.createElement ('script');
		scriptNode.textContent  = script;
		document.body.appendChild (scriptNode);
		
		setTimeout(function() {
			Step_SignalCompleted();
		 }, 3000);
	}

	function Step_SignalCompleted() {
		Send_BackgroundPage_Message("watchedSuccessfully", null);
	}

	// Allow the paging tab to subscribe it's self to the background page
	function Step_SubscribePageTab() {
	
		// Allow the background page to tell the paging script to send another
		// request to open a url.
		Bind_BackgroundPage_Listner();
		
		// Bind the content script tab to the background page
		Send_BackgroundPage_Message("bind", null);
		
		// Begin opening the first movie in the search
		Step_OpenNextMovie();
	}

	function Step_OpenNextPage() {
		var _queryString = "/advanced-search/?q%5Btitle%5D=&q%5Bis_series%5D=0&q%5Blinks%5D=1&q%5Bactor%5D=&q%5Bdirector%5D=&q%5Bdescription%5D=&q%5Byear_from%5D=0&q%5Byear_to%5D=0&q%5Bimdb_rating_from%5D=0&q%5Bimdb_rating_to%5D=0&q%5Bsolar_rating_from%5D=0&q%5Bsolar_rating_to%5D=0&q%5Bcountry%5D=0&q%5Blanguage%5D=0&order=date";
		var _pageQuery = "&page=";
		
		var _currentPageNumber = function() {
			var _uri = new URI(location.href);
			
			var _dataMap = _uri.search(true);
			

			return parseInt(_dataMap.page) + 1;
		};
		
		// Open this tabs next page
		Send_BackgroundPage_Message("openNextPage", { url: (_baseUrl + _queryString + _pageQuery + _currentPageNumber()) });
	}

	var _pendingMovies = 0;

	function Step_OpenNextMovie() {
		
		// Finished all these movies so move on to the next step.
		/*if(_currentMovieIndex == 20)
			Step_OpenNextPage();		
		else if(_currentMovieIndex < 20) {
			var _currentMovieElem = $("#search_result ul.coverList > li:eq(" + _currentMovieIndex + ")");
	
			if(_currentMovieElem != null && _currentMovieElem.length > 0) {
	
				var _movieLink = _currentMovieElem.find("a.coverImage").attr("href");
				
				Send_BackgroundPage_Message("hasWatched", { url: _baseUrl + _movieLink }, function(response) {
					
					// Increase the index counter
					_currentMovieIndex++;
					
					// Make sure we haven't watched this movie before
					if(!response.r) {
						// Tell background page to open a new tab to watch
						Send_BackgroundPage_Message("watchMovie", { url: _baseUrl + _movieLink });
					}
					
					// Open all of them
					Step_OpenNextMovie();
				});
			}
		}*/
		
		_pendingMovies = 0;
		
		$("#search_result ul.coverList > li").each(function() {
			var _currentMovieElem = $(this);
			
			var _movieLink = _currentMovieElem.find("a.coverImage").attr("href");
				
			Send_BackgroundPage_Message("hasWatched", { url: _baseUrl + _movieLink }, function(response) {
				
				// Make sure we haven't watched this movie before
				if(!response.r) {
				
					// Increase how many movies we are waiting for to finish loading
					_pendingMovies++;
					
					// Tell background page to open a new tab to watch
					Send_BackgroundPage_Message("watchMovie", { url: _baseUrl + _movieLink });
				}
			});
			
		});
	}

	function Bind_BackgroundPage_Listner() {
		chrome.runtime.onMessage.addListener(
	  		function(request, sender, sendResponse) {
	  			// Finished watching a video. Signal the search to open another video
				if (request.method == "completedWatch") {
					_pendingMovies--;
					
					if(_pendingMovies <= 0)
						Step_OpenNextPage();
				}
				// The content page was successfully bound to the background page
				else if (request.method == "bindSuccessfully") {
				} 
			}
		);
	}

	// Parm1: Method
	// Parm2: Object
	// Parm3: Response Function
	function Send_BackgroundPage_Message(m, o, r) {
		if( typeof(r) === "undefined")
			chrome.runtime.sendMessage({method: m, obj: o}, function(response) {
			  console.log("Response Code: " + response.responseCode);
			});
		else {
			chrome.runtime.sendMessage({method: m, obj: o}, r);
		}
	}

	

  ///
  /// Prototypes
  ///
	Date.ToIntervalString = function( date1, date2 ) {
	  //Get 1 day in milliseconds
	  var one_day=1000*60*60*24;

	  // Convert both dates to milliseconds
	  var date1_ms = date1.getTime();
	  var date2_ms = date2.getTime();

	  // Calculate the difference in milliseconds
	  var difference_ms = date2_ms - date1_ms;
	  //take out milliseconds
		difference_ms = difference_ms/1000;
	  var seconds = Math.floor(difference_ms % 60);
		difference_ms = difference_ms/60; 
	  var minutes = Math.floor(difference_ms % 60);
		difference_ms = difference_ms/60; 
	  var hours = Math.floor(difference_ms % 24);  
	  var days = Math.floor(difference_ms/24);
	  
	  return days + ' days, ' + hours + ' hours, ' + minutes + ' minutes, and ' + seconds + ' seconds';
	}
  
  
});