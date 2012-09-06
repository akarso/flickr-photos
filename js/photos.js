;(function ( $, window, document, undefined ) {
    
	"use strict";

    // defaults
	
    var pluginName = 'flickrImgsByTag',
        defaults = {
            tags: ['squirrel', 'cat'],
			max_per_tag: 5	
        },
		_callback = function (err, result) {
				if (err) {
					return console.error(err);
				}
				setTimeout(function(){bindEvents()}, 0);
			},
		arrCookie = [],
		target_element_id,
		globalOptions = {};
		
		

    // constructor
	
    function Plugin( element, options ) {
        target_element_id = element.getAttribute('id');
        globalOptions = $.extend( {}, defaults, options);
		
		this.element = element;		
        this._defaults = defaults;
        this._name = pluginName;
		
        this.init();
    }
	
    Plugin.prototype.init = function () {
		//var self = this;
		
        loadAllPhotos(globalOptions.tags, globalOptions.max_per_tag, loadAllPhotosCallback);
		function loadAllPhotosCallback (err, items) {
            if (err) { return _callback(err); }
            each(items.map(renderPhoto), imageAppender(target_element_id));
            _callback(null, items);			
        }
    };
	
	
	
	
	
	// helper funcs
	
    function each (items, callback) {
        var i;		
        for (i = 0; i < items.length; i += 1) {
            setTimeout(callback.bind(this, items[i]), 0);
        }
    }

    function flatten (items) {
        return items.reduce(function (a, b) {
            return a.concat(b);
        });
    }
	
	function setCookie(cName, cValue)
	{
	  document.cookie = cName + "=" + escape(cValue);
	  //optional:
	  //var date = new Date();
	  //date.setMonth(date.getMonth()+1);
	  //document.cookie += ("; expires="); 
	  //+ date.toUTCString()
	}	
	
	function getCookie(cName)
	{
	  var aCookie = document.cookie.split("; ");
	  for (var i=0; i < aCookie.length; i++)
	  {
		var aCrumb = aCookie[i].split("=");
		if (cName == aCrumb[0]) 
		  return unescape(aCrumb[1]);
	  }
	  return null;
	}
	
	function delCookie(cName)
	{
	  document.cookie = cName + "=; expires=Fri, 31 Dec 1999 23:59:59 GMT;";
	}
	
	
	
	// logic
	
	function bindEvents () {
		var $imgs = $('#' + target_element_id + ' img');
		
		//localStorage.flickrImgsByTag = '';
		setFavouriteImageData(getFavourites);
		$imgs.each(function(){$(this).hide().one('load', function() {
		  $(this).fadeIn();
			}).each(function() {
			  if(this.complete) $(this).load();
			});
		});
		$('#' + target_element_id).on('click', btnClick);
	}
	
    function loadPhotosByTag (tag, max, callback) {
        var photos = [];
        var callback_name = 'callback_' + Math.floor(Math.random() * 100000);

        window[callback_name] = function (data) {
            window[callback_name] = null;
            var i;
			max = max < data.items.length ? max : data.items.length;
            for (i = 0; i < max; i += 1) {
				//console.info(data.items[i]);
                photos.push(data.items[i].media.m);
            }
            
			callback(null, photos);
        };

        $.ajax({
            url: 'http://api.flickr.com/services/feeds/photos_public.gne',
            data: {
                tags: tag,
                lang: 'en-us',
                format: 'json',
                jsoncallback: callback_name
            },
            dataType: 'jsonp'
        });
    }

    function loadAllPhotos (tags, max, callback) {
        var results = [];
        function handleResult (err, photos) {
            if (err) { return callback(err); }

            results.push(photos);
            if (results.length === tags.length) {
                callback(null, flatten(results));
            }
        }

        each(tags, function (tag) {
            loadPhotosByTag(tag, max, handleResult);
        });
    }

    function renderPhoto (photo) {
        var img = new Image();
        img.src = photo;
		img.setAttribute('data-img-id', img.src.substring(img.src.lastIndexOf('/') + 1, img.src.lastIndexOf('_m.')));		
        return img;
    }

    function imageAppender (id) {
        var holder = document.getElementById(id);
        return function (img) {
            var elm = document.createElement('div'),
			btn = document.createElement('div');
            elm.className = 'photo icon-heart-empty';
			btn.className = 'btn_fav';
			btn.innerHTML = 'add to favourites';
            elm.appendChild(btn);
			elm.appendChild(img);
            holder.appendChild(elm);
        };
    }
	
	function gatherFavouriteImageData(){//to cookie or storage
		var $photos = $('#' + target_element_id).find('img');

		$photos.each(function(){
				var $this = $(this);
				if($this.parent().hasClass('icon-heart')){
					$this.parent().find('.btn_fav').html('remove from favourites');
					if(arrCookie.indexOf($this.attr('data-img-id')) == -1){
				  		arrCookie.push($this.attr('data-img-id'));
					}
				}else if($this.parent().hasClass('icon-heart-empty')){
					$this.parent().find('.btn_fav').html('add to favourites');
					if(arrCookie.indexOf($this.attr('data-img-id')) > -1){
						arrCookie.splice(arrCookie.indexOf($this.attr('data-img-id')), 1);
					}
				}
			}
		)
	}
	
	function setFavouriteImageData(callback){//from cookie or storage
		var $photos = $('#' + target_element_id).find('img');
		
		callback();
		
		$photos.each(function(){
				var $this = $(this);
				if(arrCookie.indexOf($this.attr('data-img-id')) > -1){					
				  $this.parent().removeClass('icon-heart-empty');
				  $this.parent().addClass('icon-heart');
				  $this.parent().find('.btn_fav').html('remove from favourites');
				}
			}
		)
	}
	
	function storeFavourites(callback){
		
		callback();		

		if(typeof(Storage) !== 'undefined')
		{
			localStorage.flickrImgsByTag = arrCookie;
		}
		else
		{
			setCookie('flickrImgsByTag', arrCookie);
		}		
	}

	function getFavourites(){
		
		if(typeof(Storage) !== 'undefined')
		{
			arrCookie = localStorage.flickrImgsByTag ? localStorage.flickrImgsByTag.split(',') : [];
		}
		else
		{
			arrCookie = getCookie('flickrImgsByTag') ? getCookie('flickrImgsByTag').split(',') : [];
		}
	}
	
	function btnClick(e){
		var $btn = $(e.target),
		imgId = $btn.attr('data-img-id');		
		if($btn.is('div')){		
			$btn.parent().toggleClass("icon-heart icon-heart-empty").parents('#' + target_element_id);
			storeFavourites(gatherFavouriteImageData);
		}
	}
    
   


    // singleton wrapper
    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, 
                new Plugin( this, options ));
            }
        });
    }



	// fallbacks (courtesy of mozilla & M$)
	
	if (!Function.prototype.bind) {
	  Function.prototype.bind = function (oThis) {
		if (typeof this !== "function") {
		  // closest thing possible to the ECMAScript 5 internal IsCallable function
		  throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
		}
	 
		var aArgs = Array.prototype.slice.call(arguments, 1), 
			fToBind = this, 
			fNOP = function () {},
			fBound = function () {
			  return fToBind.apply(this instanceof fNOP && oThis
									 ? this
									 : oThis,
								   aArgs.concat(Array.prototype.slice.call(arguments)));
			};
	 
		fNOP.prototype = this.prototype;
		fBound.prototype = new fNOP();
	 
		return fBound;
	  };
	}
	
	if (!Array.prototype.reduce) {
	  Array.prototype.reduce = function reduce(accumulator){
		if (this===null || this===undefined) throw new TypeError("Object is null or undefined");
		var i = 0, l = this.length >> 0, curr;
	 
		if(typeof accumulator !== "function") // ES5 : "If IsCallable(callbackfn) is false, throw a TypeError exception."
		  throw new TypeError("First argument is not callable");
	 
		if(arguments.length < 2) {
		  if (l === 0) throw new TypeError("Array length is 0 and no second argument");
		  curr = this[0];
		  i = 1; // start accumulating at the second element
		}
		else
		  curr = arguments[1];
	 
		while (i < l) {
		  if(i in this) curr = accumulator.call(undefined, curr, this[i], i, this);
		  ++i;
		}
	 
		return curr;
	  };
	}
	
	if (!Array.prototype.map) {
	  Array.prototype.map = function(callback, thisArg) {
		var T, A, k;
		if (this == null) {
		  throw new TypeError(" this is null or not defined");
		}
		var O = Object(this);
		var len = O.length >>> 0;
		if ({}.toString.call(callback) != "[object Function]") {
		  throw new TypeError(callback + " is not a function");
		}
		if (thisArg) {
		  T = thisArg;
		}
		A = new Array(len);
		k = 0;
		while(k < len) {
		  var kValue, mappedValue;
		  if (k in O) {
			kValue = O[ k ];
			mappedValue = callback.call(T, kValue, k, O);
			A[ k ] = mappedValue;
		  }
		  k++;
		}
		return A;
	  };      
	}
	
	if (!Array.prototype.indexOf) {
		Array.prototype.indexOf = function (obj, start) {
			for (var i = (start || 0), j = this.length; i < j; i++) {
				if (this[i] === obj) {
					return i;
				}
			}
			return -1;
		}
	}

})( jQuery, window, document );