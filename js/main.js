/* global require: false */
/* global $ */
/* global _ */
/* global Backbone */

var Backbone = require("backbone");
var $ = require("jquery");
var _ = require("underscore");
var converter = require("./lib/colorConverter");
var App = {
    Models: {},
    Collections: {},
    Views: {}
};
var colorData, colorTags;
var vent = _.extend({}, Backbone.Events);

var getTemplate = function (id) {
    return _.template($("#" + id).html());
};

var getColorData = function () {
    if (!colorData) {
        colorData = JSON.parse($("#colorData").text()).map(function (color) {
            color.hsl = converter.rgbToHsl(color.rgb);
            return color;
        }).sort(function (a,b) {
            return a.hsl[0] < b.hsl[0] ? -1 : 1;
        });
    }

    return colorData;
};

var getColorTags = function (colorData) {

    if (!colorTags) {
        var uniques = _.unique(_.flatten(_.pluck(colorData, 'families')));
        var colorRegex = new RegExp("^.*(red|orange|yellow|green|blue|indigo|purple|violet|brown|teal|pink).*$");

        colorTags = { byColor: [], byOther: [] };

        _.each(uniques, function (tag, i) {
            var tagHash = { name: tag };
            if (colorRegex.test(tag)) {
                colorTags.byColor.push(tagHash);
            } else {
                colorTags.byOther.push(tagHash);
            }
        });
    }

    return colorTags;
};

App.Views.Master = Backbone.View.extend({
    el: $("#colorApp"),

    initialize: function () {
        var def = {};
        var master = this;

        // append other views here
        

        var colorData = getColorData();
        var palette = new App.Collections.FullPalette();
        def.palette = palette.fetch();

        $.when(def.palette).done(function (colorData, status, jqXHR) {
            var colorWheel = new App.Views.ColorWheel({ collection: palette });
            
            var tags = getColorTags(palette.toJSON());
            var filtersByColor = new App.Collections.FilterSet(tags.byColor);
            var filtersByOther = new App.Collections.FilterSet(tags.byOther);
            var filtersByColorSet = new App.Views.FilterSet({ collection: filtersByColor });
            var filtersByOtherSet = new App.Views.FilterSet({ collection: filtersByOther }); 
            
            master.$el.append(filtersByColorSet.render().el, filtersByOtherSet.render().el);
            master.$el.append(colorWheel.render().el);
        });
    }
});

App.Models.Color = Backbone.Model.extend({

    parse: function (response) {
        return response;
    }

});

App.Models.Filter = Backbone.Model.extend({
    defaults: { active: false }
});

App.Views.ColorWedge = Backbone.View.extend({

    tagName: "div",
    className: "wedge",
    template: getTemplate("colorWedge"),

    initialize: function () {
        vent.on("filter:on", function () {

        });
    },

    events: {
        'click': 'openColor'
    },

    openColor: function(e) {
        e.preventDefault();
        // console.log(this.model.get('name'));
    },

    render: function () {
        this.$el.html(this.template({ color: this.model.toJSON() }));
        return this;
    }
});

App.Views.Filter = Backbone.View.extend({
    tagName: "li",
    template: getTemplate("colorFilter"),

    events: {
        "click": "toggleFilter"
    },

    toggleFilter: function (e) {
        e.preventDefault();
        var filterName = this.model.get("name");

        this.$el.toggleClass("active");

        if (this.model.get('active')) {
            this.model.set('active', false);
            vent.trigger("filter:off", filterName);
        } else {
            this.model.set("active", true);
            vent.trigger("filter:on", filterName);
        }

    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});

App.Collections.FullPalette = Backbone.Collection.extend({

    model: App.Models.Color,
    url: "/colorData.json",

    initialize: function () {
       
    }

});

App.Collections.FilterSet = Backbone.Collection.extend({
    model: App.Models.Filter
});

App.Views.ColorWheel = Backbone.View.extend({

    tagName: "div",
    className: "wheel",

    initialize: function () {
        
    },
    
    append: function (color, i) {
        var wedge = new App.Views.ColorWedge({ model: color });
        var rotation = (360 / getColorData().length * (i + 1));
        wedge.render().$el.css({
            transform: "rotate(" + rotation + "deg)"
        });

        wedge.$el.find(".name").css({
            transform: "rotate(-" + rotation + "deg)"
        });
        
        this.$el.append(wedge.el);
    },
    render: function () {
        this.collection.each(this.append, this);
        return this;
    }
});

App.Views.FilterSet = Backbone.View.extend({
    tagName: "ul",
    className: "filter-set",
    append: function (f) {
        var filter = new App.Views.Filter({ model: f });
        this.$el.append(filter.render().el);
    },
    render: function () {
        this.collection.each(this.append, this);
        return this;
    }
});

$(document).ready(function () {
    window.colorApp = new App.Views.Master();
});