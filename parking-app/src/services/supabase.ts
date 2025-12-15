
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const supabaseUrl = 'https://rnkrkuuujiqoixrrrbmk.supabase.co'
const supabaseKey = Constants.expoConfig?.extra?.supabaseKey || process.env.SUPABASE_KEY
console.log('Supabase key:', supabaseKey ? 'Key found' : 'Key missing')
const supabase = createClient(supabaseUrl, supabaseKey)

const getData = async () => {
  console.log('getData: Fetching from parking_spots table')
  const { data, error } = await supabase.from('parking_spots').select('*')
  if (error) {
    console.error('getData error:', error)
    throw error
  }
  console.log('getData raw response:', data)
  return data
}


const updateData = async (parkingLotSelect: boolean, spotsID: String) => {
    console.log('updateData called with:', { parkingLotSelect, spotsID })

    if (parkingLotSelect === true) {
        const { error, data } = await supabase.from('parking_spots')
            .update({ status: 'occupied' })  // Changed from 'notavailable' to 'occupied'
            .eq('id', spotsID)
            .select()
        if (error) {
            console.error('Error updating to occupied:', error)
        } else {
            console.log('Updated to occupied:', data)
        }
    } else {
        const { error, data } = await supabase.from('parking_spots')
            .update({ status: 'available' })
            .eq('id', spotsID)
            .select()
        if (error) {
            console.error('Error updating to available:', error)
        } else {
            console.log('Updated to available:', data)
        }
    }
}



const loadHomeData = async (id: String) => {
    console.log('loadHomeData called with id:', id)
    console.log('loadHomeData: Fetching from parking_spots_home table')
    let { data, error } = await supabase.from('parking_spots_home').select('polygon,status').eq('id', id);
    console.log('loadHomeData raw response:', { data, error })
    return { data, error };
};

const loadPolygonData = async (id: String) => {
    console.log("Load polygon function is in.")
    let { data, error } = await supabase.from("parking_spots_home").select("polygon").eq("id", id);
    console.log("loadPolygonData raw response:", { data, error })
    return { data, error };
}

const updatePolygonAvailability = async (id: String, check: boolean) => {
    console.log("updatePolygonAvailability function is in.")
    if (check) {
        const { data, error } = await supabase.from("parking_spots_home")
            .update({ status: 'occupied' })
            .eq("id", id);
        console.log("spot is not available")
        if (error) console.error("Error updating to occupied:", error);
    } else {
        const { data, error } = await supabase.from("parking_spots_home")
            .update({ status: 'available' })
            .eq("id", id);
        console.log("spot is available")
        if (error) console.error("Error updating to available:", error);
    }
}

    

export { getData, updateData, loadHomeData, loadPolygonData, updatePolygonAvailability }

