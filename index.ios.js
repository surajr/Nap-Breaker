/**
* Sample React Native App
* https://github.com/facebook/react-native
* @flow
*/

"use strict";

import React, { Component } from 'react';
import {
  Alert,
  AppRegistry,
    Button,
    Navigator,
  StyleSheet,
  Text,
  TouchableHighlight,
    TouchableOpacity,
  Vibration,
  View
} from 'react-native';
import MapView from 'react-native-maps';

var {GooglePlacesAutocomplete} = require('react-native-google-places-autocomplete');

//navigation
const nav_routes = [
                    {title: 'Map', index: 0},
                    {title: 'Address', index: 1},
                    {title: 'BusDetails', index: 2},
                    ];

export default class napBreaker extends Component {

  constructor(props) {
    super(props);
      this.state = {
          isDestinationSet: false,
          initialPosition: {
          latitude: 30.264,
          longitude: -97.74,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
          },
          lastPosition: {
          latitude: 30.264,
          longitude: -97.74
          },
          region: {
          latitude: 30.264,
          longitude: -97.74,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
          },
          destMarker: {
          coordinate: {
          latitude: 0,
          longitude: 0
          },
          loaded: false
          },
          busStopMarkers: [],
          selectedRoute: null,
          destination: null
      };
          
      this.watchID = null;
  }
    
    componentWillMount() {
        navigator.geolocation.getCurrentPosition(
             (position) => {
             let lat = position.coords.latitude;
             let lon = position.coords.longitude;
             this.fetchStopData(lat, lon);
             this.state.initialPosition = {
             latitude: lat,
             longitude: lon,
             latitudeDelta: 0.02,
             longitudeDelta: 0.02
             };
             this.state.region = this.state.initialPosition;
             console.log("init lat: " + this.state.region.latitude + ", long: " + this.state.region.longitude);
             },
             (error) => alert(JSON.stringify(error)),
        );
        
        this.watchID = navigator.geolocation.watchPosition(
               (position) => {
//                                                           console.log("watch position triggered");
               //console.log("destination (from watch) - lat: " + this.state.destination.latitude + ", long: " + this.state.destination.longitude);
               this.setState({lastPosition: {
                   latitude: position.coords.latitude,
                   longitude: position.coords.longitude
                 }}, () => {
                       //console.log("watch position triggered");
                       console.log("last lat: " + this.state.lastPosition.latitude + ", long: " + this.state.lastPosition.longitude);
                       if (this.state.destination !== null) {
                           let distance = getDistanceKmBetween(
                                                               this.state.lastPosition,
                                                               this.state.destination);
                           console.log(`Distance to dest: ${distance} km`);
                           if (distance < 1) {
                               console.log("Vibrating!!!");
                               alert("Wake up!");
                               Vibration.vibrate();
                           }
                       }
                    });
               }, (error) => alert(JSON.stringify(error)),
               {enableHighAccuracy: true}
               );

    }

  fetchStopData() {
      //console.log("fetching data from lat: " + latitude + ", long: " + longitude);
      //console.log("while region at lat: " + this.state.region.latitude + ", long: " + this.state.region.longitude);
      let stopQuery = (this.state.selectedRoute === null) ?
        '' :
        `stopNo=${this.state.selectedRoute}`;
      let requestUrl = `https://api.translink.ca/RTTIAPI/V1/stops` +
        `?apiKey=rQef46wC3btmRlRln1gi&radius=2000` +
        `&lat=${this.state.region.latitude.toFixed(6)}&long=${this.state.region.longitude.toFixed(6)}${stopQuery}`;
      let response = fetch(requestUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }}).then((response) => {
          response.json().then((responseStops) => {
            if (typeof responseStops.map !== 'function') {
              //console.warn(`No stops found for (${latitude}, ${longitude}.`);
              return;
            }
            let stops = responseStops.map((responseStop) => {
              return {
                stopNum: responseStop.StopNo,
                name: responseStop.Name,
                routes: responseStop.Routes,
                coordinate: {
                  latitude: responseStop.Latitude,
                  longitude: responseStop.Longitude
                }
              };
            });
            this.setState({busStopMarkers: stops});
          }).catch((error) => {
            console.error(error);
          })
        }).catch((error) => {
          console.error(error);
        });
    }

    componentWillUnmount() {
      navigator.geolocation.clearWatch(this.watchID);
    }

    onButtonPressed(data, details = null) {
      let address = data.description;
      var API = "https://maps.googleapis.com/maps/api/geocode/json?address=" + address + "&key=AIzaSyC4zC0FQBYsOf8E50t00kmC8lzW7nPUn8s";
      let response = fetch(API, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }}).then((response) => {
          response.json().then((geocode) => {
            let lat = geocode.results[0].geometry.location.lat;
            let long = geocode.results[0].geometry.location.lng;
            this.setState({region: {latitude: lat, longitude: long, latitudeDelta: 0.02, longitudeDelta:0.02}});
            this.setState({isDestinationSet: false});   //about to set a new destination!
          }).catch((error) => {
            console.error(error);
          })
        }).catch((error) => {
          console.error(error);
        });
    }

    onRegionChangeComplete(region) {
        this.setState({region});
        if(this.state.isDestinationSet==false) {
            this.fetchStopData();  //ISSUE FIX: this.fetchStopData(region.latitude, region.longitude) -> region.latitude and region.longitude values were incorrect,
            console.log("fetching data while isDestinationSet is " + this.state.isDestinationSet);
        }
        console.log("changed to lat: " + this.state.region.latitude + ", long: " + this.state.region.longitude);
    }
    
    render() {
         
         return (
            //view controller
            <Navigator
               initialRoute={nav_routes[0]}
               initialRouteStack = {nav_routes}
               renderScene = {(route, navigator) => {
                 
                 if(route.index==1) {
                 //Secondary view - map
                 return (
                         <View style = {styles.parent}>
                             <View style={styles.fullscreen}>
                             <MapView
                             style={{flex:0.75}}
                             initialRegion={{
                             latitude: this.state.destMarker.coordinate.latitude,
                             longitude: this.state.destMarker.coordinate.longitude,
                             latitudeDelta: 0.02,
                             longitudeDelta: 0.02,
                             }}
                             region = {this.state.region}
                             loadingEnabled={true}
                             ref = {ref => {this.map = ref; }}
                             showsUserLocation = {true}
                             scrollEnabled = {true}
                             onRegionChangeComplete = {
                                this.onRegionChangeComplete.bind(this)
                             }
                             >

                         {this.state.busStopMarkers.map(busStopMarker => (
                                  <MapView.Marker
                                  key={busStopMarker.stopNum}
                                  identifier={JSON.stringify(busStopMarker.stopNum)}
                                  title = {busStopMarker.name}
                                  coordinate={busStopMarker.coordinate}
                                  >
                                  <MapView.Callout>
                                  <TouchableOpacity
                                      onPress = { () => {
                                          Alert.alert(
                                                      busStopMarker.name,
                                                      `Do you want to set your destination as ` +
                                                      `${busStopMarker.name} [${busStopMarker.routes}]?`,
                                                      [
                                                       {text: 'Nope.', onPress: () => console.log('Cancel pressed')},
                                                       {text: 'Yes, let me nap!', onPress: () => {
                                                       console.log('OK Pressed');
                                                       this.setState({destination: busStopMarker.coordinate});
                                                       
                                                       var busStopMarkers = [];
                                                       busStopMarkers.push(busStopMarker);
                                                       this.setState({busStopMarkers});
                                                       
                                                       this.setState({isDestinationSet: true});
                                                       
                                                       var coords = [];
                                                       coords.push(this.state.lastPosition);
                                                       coords.push(busStopMarker.coordinate);
                                                       
                                                       this.map.fitToCoordinates(coords, {edgePadding: {top: 50, right: 50, bottom: 50, left: 50}, animated: false});
                                                       }}
                                                       ]
                                                      );
                                  }}
                                  >
                                  <Text>	{busStopMarker.name} </Text>
                                  </TouchableOpacity>
                                  </MapView.Callout>
                                  </MapView.Marker>
                                  ))}

                            <MapView.Marker
                                 coordinate = {this.state.destMarker.coordinate}
                                 pinColor = "blue"
                             />
                             </MapView>
                             </View>
                         
                             <View style = {[{bottom: 10}, styles.overlay]}>
                                 <Button
                                onPress={() => {navigator.pop()}}  //return to index 0 (search page)
                                 title="Destination Address"
                                 />
                             </View>
                             <View style = {[{bottom: 60}, styles.overlay]}>
                             <Button
                             onPress={() => {navigator.push(nav_routes[2])}}    //go to index 2 (not implemented yet)
                             title="Bus Route"
                             />
                             </View>
                         </View>
                         );
                 }
                 else if(route.index==0) {
                 //main view - search page
                 return (
                         <GooglePlacesAutocomplete
                             placeholder='Enter Destination'
                             minLength={2} // minimum length of text to search
                             autoFocus={false}
                             listViewDisplayed='true'    // true/false/undefined
                             fetchDetails={true}
                             renderDescription={(row) => row.description} // custom description render
                             onPress={ (data, details=null) => {
                             this.onButtonPressed(data, details);
                             navigator.push(nav_routes[1]);
                             }}
                             getDefaultValue={() => {
                             return ''; // text input default value
                             }}
                             query={{
                             // available options: https://developers.google.com/places/web-service/autocomplete
                             key: 'AIzaSyCr1YQ52b_kW7IDE-5e5rEtjuSOuaB8zqA',
                             language: 'en', // language of the results
                             components: 'country:ca'   //limit searches to Canada
                             }}
                             styles={{
                             description: {
                             fontWeight: 'bold',
                             },
                             predefinedPlacesDescription: {
                             color: '#1faadb',
                             },
                             }}
                             
                             nearbyPlacesAPI='GooglePlacesSearch' // Which API to use: GoogleReverseGeocoding or GooglePlacesSearch
                             GoogleReverseGeocodingQuery={{
                             // available options for GoogleReverseGeocoding API : https://developers.google.com/maps/documentation/geocoding/intro
                             }}
                             GooglePlacesSearchQuery={{
                             // available options for GooglePlacesSearch API : https://developers.google.com/places/web-service/search
                             rankby: 'distance',
                             }}
                             
                             debounce={200} // debounce the requests in ms. Set to 0 to remove debounce. By default 200ms.
                         />
                         );
                 }
                 else if(route.index==2) {
                        //Third view; not implemented
                 }

                 
                 }}
             />
        );
    }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
 fullscreen: {
 flex:1
 },
 parent: {
 flex:1
 },
 overlay: {
 right: 10,
 position: 'absolute',
 backgroundColor: "white",
 opacity: 0.8,
 borderRadius: 20,
 overflow: 'hidden'
 }
});

AppRegistry.registerComponent('napBreaker', () => napBreaker);

function getDistanceKmBetween(coord1, coord2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(coord1.latitude - coord2.latitude);
  var dLon = deg2rad(coord1.longitude - coord2.longitude);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(coord1.latitude)) * Math.cos(deg2rad(coord2.latitude)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}
