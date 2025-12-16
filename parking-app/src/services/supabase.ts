
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

const getRowCount = async () => {
  const { count, error } = await supabase
    .from('parking_spots')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error('getRowCount error:', error)
    throw error
  }
  
  return count
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



interface LoadHomeDataResult {
    data: any[] | null;
    error: any;
}

const loadHomeData = async (id: String): Promise<LoadHomeDataResult> => {
    const result = await supabase.from('parking_spots').select('polygon,status').eq('id', id);
    console.log('loadHomeData raw response:', { data: result.data, error: result.error })
    return { data: result.data, error: result.error };
};

const loadPolygonData = async (id: String) => {
    let { data, error } = await supabase.from("parking_spots").select("polygon").eq("id", id);
    console.log("loadPolygonData raw response:", { data, error })
    return { data, error };
}


// Updates the supabase status in realtime (Hopegully)
const updatePolygonAvailability = async (id: String, check: boolean) => {
    console.log("updatePolygonAvailability function is in.")
    if (check) {
        const { data, error } = await supabase.from("parking_spots")
            .update({ status: 'occupied' })
            .eq("id", id);
        console.log("spot is not available")
        if (error) console.error("Error updating to occupied:", error);
    } else {
        const { data, error } = await supabase.from("parking_spots")
            .update({ status: 'available' })
            .eq("id", id);
        console.log("spot is available")
        if (error) console.error("Error updating to available:", error);
    }
}

    

export { getData, updateData, loadHomeData, loadPolygonData, updatePolygonAvailability, getRowCount, supabase }

