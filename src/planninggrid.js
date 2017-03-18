(function($) {
    var defaults = {
        event_source: function() {
            return [];
        },
        hourResolution: 2,
        day: '2017-03-13',
        dayResolution: 1,
        days: 7,
        view: 'week',
        onSelected : function (from, to) {
        	console.log('selection');
            
            return true;
        }
    };

    var _templates = {
        week: `<div class="pg-wrapper">
        	<section class="pg-layer pg-dayheaders">
            	<%  var width = 100.0 / _o.days;
                    var days = [ 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag' ];

                    for (var d = 0; d < _o.days; d++) { 
                %>
                <div class="pg-day-head" style="width: <%= width %>%;">
                    <div class="pg-day-head-content"><%- days[d] %></div>
                </div>
                <% 
                    } %>
            </section>
            <div class="clearfix"></div>
        </div>
        <div class="pg-wrapper">
            <section class="pg-layer pg-hourrows">
                <div class="pg-header"></div>
                <div class="pg-content">
                    <%  for (var h = 0; h < 24; h++) { %>
                    <div class="pg-hour">
                        <div class="pg-hour-head">
                            <%- _h.f_hour(h) %>
                        </div>
                        <div class="pg-hour-content">
                            <%  for (var i = 0; i < _o.hourResolution; i++) { %>
                            <div class="pg-hourpart"></div>
                            <%  } %>
                        </div>
                    </div>
                    <%  } %>
                </div>
            </section>

            <section class="pg-layer pg-daycols">
                <%  var width = 100.0 / _o.days;
                
                    for (var d = 0; d < _o.days; d++) { %>
                <div class="pg-day" style="width: <%= width %>%;">
                    <%  for (var h = 0; h < 24; h++) { 
                            for (var i = 0; i < _o.hourResolution; i++) { %>
                    <div class="pg-cell">
                    </div>
                    <%      }
                        } %>
                </div>
                <% } %>
            </section>
            
            <section class="pg-layer pg-events">
            		<% var col_width = 100.0 / _o.days;

                for (var d = 0; d < _o.days; d++) { %>
                <div class="pg-day" style="width: <%= width %>%;">
                    <% for (var h = 0; h < 24; h++) { 
                           for (var i = 0; i < _o.hourResolution; i++) { %>
                    <div class="pg-cell">
                    </div>
                    <%     }
                       } %>
                </div>
                <% } %>
            </section>
            
            <div class="clearfix"></div>
        </div>`
    };

    var _viewHelpers = {
        f_hour: function(hour, minute) {
            minute = minute || 0;

            var raw = hour.toString() + ":" + minute.toString();

            return moment(raw, "H:m").format("HH:mm");
        }
    };

    PlanningGrid.prototype.view = function(view) {
        var selector = new PlanningGridSelector();

        _render(this, view || this.options.view);
        selector.enable(this, this.options.onSelected);
    };

	function _getNamedTemplate(view) {
    	return _templates[view];
    }
    
    function _getRawTemplate(view) {
    	return view;
    }

	function _getUrlTemplate(view) {
    	var template = null;
    
    	if (view.startsWith('url:')) {
        	var url = view.slice(4);
            
    		return 'Custom view fetching not supported.';
        }
        
        return template;
    }

    function _render(pg, view) {
    	try {
	    	var template = _getNamedTemplate(view)
    	    			|| _getUrlTemplate(view)
        	            || _getRawTemplate(view);
        	var content = _.template(template)({
            	_o: pg.options,
	            _h: _viewHelpers
    	    });
        } catch (err) {
        	console.log(['Error rendering view! Check the following requirements:'
                      , '  1) Did you include the required Underscore dependency?'
                      , '  2) Does the (required) view option satisfy one of the following?'
                      , '     - a supported named view: week;'
                      , '     - a valid URL prefixed with "url:";'
                      , '     - a valid raw Underscore template.'
                      , '  3) Are all custom options used in the template defined in the PlanningGrid?'
                      , 'The following error message was caught during the execution:'
                      , '  ' + err].join('\n'));
        }

        pg.context.append(content);
    }

    function _debug(obj) {
        console.log(obj);
    }

    function PlanningGrid(params, context) {
        this.options = $.extend(true, {}, defaults, params);
        this.context = context;

        context.addClass('pg-context');
        context.addClass('noselect');

        this.view(this.options.view);

        return this;
    }

    function PlanningGridSelector() {
        this.pivot = null;

        this.enable = function(pg, callback) {
            var self = this;

            this.pg = pg;
            this.callback = callback;

            function deselect() {
                self.pivot.siblings('.active').removeClass('active');
                self.pivot.removeClass('pg-sel-pivot');
                self.pivot = null;
            }

            function invokeCallback(offset) {
                var selection = [self.pivot, offset];

                if (!self.pivot.nextAll('.pg-cell').is(offset)) {
                    selection.reverse();
                }

                return self.callback.apply(pg, selection);
            }

            pg.context.find('.pg-cell').on('mousedown', function(e) {
            	e.preventDefault();
                
                self.pivot = $(this);
                self.pivot.addClass('pg-sel-pivot');
            });

            pg.context.find('.pg-cell').on('mouseup', function(e) {
                e.preventDefault();

                if (self.pivot) {
                    if (invokeCallback($(this))) {
                    	deselect($(this));
                    }
                }
            });

            pg.context.find('.pg-cell').on('mousemove', function(e) {
                $(this).addClass('hover');

                if (self.pivot) {
                	var range = $();
                    
                	if (self.pivot.nextAll().is($(this))) {
                    	range = self.pivot.nextUntil($(this)).add($(this));
                        range.addClass('pg-drag-down');
                    } else if (self.pivot.prevAll().is($(this))) {
                    	range = self.pivot.prevUntil($(this)).add($(this));
                        range.addClass('pg-drag-up');
                    }

                    range.addClass('active');  self.pivot.siblings('.active').not(range)
                    	.removeClass('active')
                        .removeClass('pg-drag-up')
                        .removeClass('pg-drag-down');
                }
            });

            pg.context.find('.pg-cell').on('mouseleave', function(e) {
                $(this).removeClass('hover');
            });

            pg.context.find('.pg-day').on('mouseleave', function(e) {
            	if (self.pivot) {
                	deselect();
                }
            });
        };
    }

    $.fn.planninggrid = function(params) {
        return new PlanningGrid(params, this);
    };
}(jQuery));
